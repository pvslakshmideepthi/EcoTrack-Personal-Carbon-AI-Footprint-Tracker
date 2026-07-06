import React, { useEffect, useMemo, useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { api, setApiAuthToken } from './api';
import { evaluateBadges } from './badges';
import {
  auth,
  createUserWithEmailAndPassword,
  db,
  firebaseConfigStatus,
  firebaseEnabled,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from './firebase';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
);

const todayKey = () => new Date().toISOString().slice(0, 10);

const defaultForm = {
  date: todayKey(),
  transport_mode: 'Bus',
  distance: 12,
  diet_type: 'Vegetarian',
  food_waste: false,
  electricity_kwh: 6,
  heating: false,
  ac: false,
};

const categories = [
  { key: 'travel_emissions', label: 'Travel', color: '#2563eb' },
  { key: 'food_emissions', label: 'Food', color: '#7c3aed' },
  { key: 'energy_emissions', label: 'Energy', color: '#4f46e5' },
];

const badgeCatalog = [
  { id: 'first_step', name: 'First Step', detail: 'Log your first habit day.' },
  { id: 'low_energy', name: 'Low Energy', detail: 'Keep energy below 2 kg CO2e.' },
  { id: 'plant_day', name: 'Plant Day', detail: 'Choose vegetarian or vegan meals.' },
  { id: 'pedal_power', name: 'Pedal Power', detail: 'Walk or cycle for transport.' },
  { id: 'budget_clear', name: 'Budget Clear', detail: 'Stay under the daily budget.' },
  { id: 'zero_waster', name: 'Zero Waster', detail: 'Report no food waste.' },
  { id: 'streak_3', name: '3-Day Streak', detail: 'Log three days in a row.' },
  { id: 'streak_7', name: 'Week Warrior', detail: 'Log seven consistent days.' },
  { id: 'monthly_hero', name: 'Monthly Hero', detail: 'Beat budget 20 days this month.' },
  { id: 'monthly_master', name: 'Monthly Master', detail: 'Complete 30 daily logs.' },
];

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function friendlyAuthError(error) {
  if (error?.code === 'auth/api-key-not-valid') {
    return `Firebase rejected the web API key for project "${firebaseConfigStatus.projectId}". Copy the web app config again from Firebase Console > Project settings > General > Your apps, update frontend/.env, then restart npm run dev.`;
  }
  if (error?.code === 'auth/operation-not-allowed') {
    return 'Email/Password login is not enabled. Open Firebase Console > Authentication > Sign-in method and enable Email/Password.';
  }
  if (error?.code === 'auth/invalid-credential') {
    return 'Invalid email or password. Use the registered credentials or create a new account.';
  }
  if (error?.code === 'auth/email-already-in-use') {
    return 'This email is already registered. Switch to Login and sign in with the same email.';
  }
  if (error?.code === 'auth/weak-password') {
    return 'Password should be at least 6 characters.';
  }
  return error?.message || 'Authentication failed. Check Firebase Authentication settings.';
}

const localTransportCoefficients = {
  'Car Petrol': 0.192,
  'Car Diesel': 0.171,
  'Car Electric': 0.053,
  Bus: 0.089,
  Train: 0.041,
  Motorcycle: 0.114,
  Bicycle: 0,
  Walking: 0,
  'Flight Short-haul': 0.255,
  'Flight Long-haul': 0.195,
};

const localFoodCoefficients = {
  'Meat-heavy': 7.19,
  Omnivore: 5.63,
  Vegetarian: 3.81,
  Vegan: 2.89,
};

const localDatabaseKey = 'ecotrack-app-database-v1';

function readLocalDatabase() {
  try {
    return JSON.parse(localStorage.getItem(localDatabaseKey)) || { users: {}, logs: {}, badges: {} };
  } catch {
    return { users: {}, logs: {}, badges: {} };
  }
}

function writeLocalDatabase(database) {
  localStorage.setItem(localDatabaseKey, JSON.stringify(database));
}

function localUserId(email) {
  return `local-${email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function getLocalUserRecord(userId) {
  return readLocalDatabase().users[userId] || null;
}

function upsertLocalUser(user) {
  const database = readLocalDatabase();
  database.users[user.uid] = { ...database.users[user.uid], ...user };
  database.logs[user.uid] = database.logs[user.uid] || {};
  database.badges[user.uid] = database.badges[user.uid] || [];
  writeLocalDatabase(database);
}

function saveLocalLog(userId, log) {
  const database = readLocalDatabase();
  database.logs[userId] = database.logs[userId] || {};
  database.logs[userId][log.date] = log;
  writeLocalDatabase(database);
}

function saveLocalBadges(userId, nextBadges) {
  const database = readLocalDatabase();
  database.badges[userId] = nextBadges;
  writeLocalDatabase(database);
}

function getLocalHistory(userId) {
  const logs = readLocalDatabase().logs[userId] || {};
  return Object.values(logs).sort((a, b) => a.date.localeCompare(b.date));
}

function getLocalBadges(userId) {
  return readLocalDatabase().badges[userId] || [];
}

function calculateFootprintLocally(data) {
  const distance = toNumber(data.distance);
  const electricityKwh = toNumber(data.electricity_kwh);

  if (distance < 0 || electricityKwh < 0) {
    throw new Error('Distance and electricity must be non-negative values.');
  }

  const travelEmissions = (localTransportCoefficients[data.transport_mode] ?? 0) * distance;
  let foodEmissions = localFoodCoefficients[data.diet_type] ?? 0;
  if (data.food_waste === true) foodEmissions *= 1.1;

  let energyEmissions = electricityKwh * 0.233;
  if (data.heating) energyEmissions += 2;
  if (data.ac) energyEmissions += 1.5;

  const total = travelEmissions + foodEmissions + energyEmissions;

  return {
    success: true,
    travel_emissions: Number(travelEmissions.toFixed(2)),
    food_emissions: Number(foodEmissions.toFixed(2)),
    energy_emissions: Number(energyEmissions.toFixed(2)),
    total: Number(total.toFixed(2)),
    calculation_method: 'local verified coefficients',
    breakdown: data,
  };
}

function generateLocalRecommendations(log, personalBudget) {
  if (!log?.total) {
    return [
      {
        title: 'Create your first carbon log',
        description: 'Add today\'s travel, food, and electricity usage so EcoTrack can calculate your personal footprint and start trend analysis.',
        category: 'Getting started',
        estimated_co2_saving: 'Baseline required',
      },
      {
        title: 'Set a daily carbon budget',
        description: 'Keep the budget visible so every new log can be compared against a clear reduction target.',
        category: 'Planning',
        estimated_co2_saving: 'Trackable reduction',
      },
      {
        title: 'Use public transport for routine trips',
        description: 'Bus and train travel usually reduce per-kilometer emissions compared with petrol or diesel car trips.',
        category: 'Travel',
        estimated_co2_saving: '0.5-2.5 kg CO2e/day',
      },
    ];
  }

  const categoryEntries = [
    ['Travel', log.travel_emissions || 0],
    ['Food', log.food_emissions || 0],
    ['Energy', log.energy_emissions || 0],
  ].sort((a, b) => b[1] - a[1]);
  const highest = categoryEntries[0][0];

  const focusedAction = {
    Travel: {
      title: 'Reduce the highest travel segment',
      description: 'Replace one car trip with bus, train, cycling, or walking where practical. Travel is currently your largest category.',
      category: 'Travel',
      estimated_co2_saving: `${Math.max(0.2, (log.travel_emissions * 0.35)).toFixed(1)} kg CO2e/day`,
    },
    Food: {
      title: 'Shift one meal plant-forward',
      description: 'Keep vegetarian or vegan choices on high-footprint days and avoid food waste to cut your food emissions.',
      category: 'Food',
      estimated_co2_saving: `${Math.max(0.3, (log.food_emissions * 0.25)).toFixed(1)} kg CO2e/day`,
    },
    Energy: {
      title: 'Trim peak electricity use',
      description: 'Run cooling more efficiently, turn off standby loads, and move flexible usage away from high-consumption hours.',
      category: 'Energy',
      estimated_co2_saving: `${Math.max(0.2, (log.energy_emissions * 0.3)).toFixed(1)} kg CO2e/day`,
    },
  }[highest];

  return [
    focusedAction,
    {
      title: log.total > personalBudget ? 'Recover below your daily budget' : 'Protect your budget streak',
      description: log.total > personalBudget
        ? `Your latest footprint is ${(log.total - personalBudget).toFixed(1)} kg over budget. Target the largest category first and keep the next log under ${personalBudget.toFixed(1)} kg.`
        : `Your latest footprint is under the ${personalBudget.toFixed(1)} kg budget. Repeat the same transport and energy pattern tomorrow.`,
      category: 'Budget',
      estimated_co2_saving: `${Math.abs(log.total - personalBudget).toFixed(1)} kg target gap`,
    },
    {
      title: 'Preserve the log habit',
      description: 'Consistent daily logging improves trend accuracy and makes AI recommendations more personal over time.',
      category: 'Analytics',
      estimated_co2_saving: 'Improves measurement accuracy',
    },
  ];
}

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [form, setForm] = useState(defaultForm);
  const [userId, setUserId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [storageMode, setStorageMode] = useState('app');
  const [connection, setConnection] = useState(firebaseEnabled ? 'Waiting for secure login' : 'In-app database ready');
  const [history, setHistory] = useState([]);
  const [budget, setBudget] = useState(() => Number(localStorage.getItem('ecotrack-budget')) || 8);
  const [badges, setBadges] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const latest = history[history.length - 1] || { total: 0, travel_emissions: 0, food_emissions: 0, energy_emissions: 0 };
  const average = history.length ? history.reduce((sum, item) => sum + toNumber(item.total), 0) / history.length : 0;
  const weeklyTotal = history.slice(-7).reduce((sum, item) => sum + toNumber(item.total), 0);
  const budgetUsed = budget > 0 ? Math.min(100, Math.round((toNumber(latest.total) / budget) * 100)) : 0;
  const bestDay = history.length ? history.reduce((best, item) => (item.total < best.total ? item : best), history[0]) : null;
  const syncLabel = storageMode === 'firebase' ? 'Firestore realtime sync' : 'In-app persistent database';

  useEffect(() => {
    if (!firebaseEnabled) {
      setConnection('In-app database ready');
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        setApiAuthToken(token);
        setCurrentUser(user);
        setUserId(user.uid);
        setStorageMode('firebase');
        setConnection('Firestore realtime sync');
      } else {
        setApiAuthToken('');
        setCurrentUser(null);
        setUserId('');
        setHistory([]);
        setBadges([]);
        setStorageMode('app');
        setConnection('Waiting for secure login');
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!userId) return undefined;

    if (storageMode === 'app') {
      const localRecord = getLocalUserRecord(userId);
      const localHistory = getLocalHistory(userId);
      setHistory(localHistory);
      setBadges(getLocalBadges(userId));
      if (localRecord?.daily_budget) setBudget(Number(localRecord.daily_budget));

      api.getSettings(userId).then((response) => {
        if (response.data?.daily_budget) setBudget(Number(response.data.daily_budget));
      }).catch(() => {});
      api.getHistory(userId).then((response) => {
        if (Array.isArray(response.data)) {
          const backendHistory = response.data.reverse();
          setHistory(backendHistory);
          backendHistory.forEach((log) => saveLocalLog(userId, log));
        }
      }).catch(() => {});
      api.getBadges(userId).then((response) => {
        if (Array.isArray(response.data?.badges)) {
          setBadges(response.data.badges);
          saveLocalBadges(userId, response.data.badges);
        }
      }).catch(() => {});
      return undefined;
    }

    if (firebaseEnabled && db) {
      const logQuery = query(
        collection(db, 'logs', userId, 'daily'),
        orderBy('date', 'desc'),
        limit(30),
      );
      const unsubscribeLogs = onSnapshot(logQuery, (snapshot) => {
        const cloudLogs = snapshot.docs
          .map((entry) => entry.data())
          .sort((a, b) => a.date.localeCompare(b.date));
        setHistory(cloudLogs);
      }, () => {
        setNotice('Firestore listener could not load logs. Check Firebase rules and project keys.');
      });

      const unsubscribeSettings = onSnapshot(doc(db, 'users', userId), (snapshot) => {
        const data = snapshot.data();
        if (data?.daily_budget) setBudget(Number(data.daily_budget));
      });

      const unsubscribeBadges = onSnapshot(doc(db, 'badges', userId), (snapshot) => {
        const data = snapshot.data();
        if (Array.isArray(data?.badges)) setBadges(data.badges);
      });

      return () => {
        unsubscribeLogs();
        unsubscribeSettings();
        unsubscribeBadges();
      };
    }
    return undefined;
  }, [storageMode, userId]);

  useEffect(() => {
    localStorage.setItem('ecotrack-budget', String(budget));
  }, [budget]);

  const lineData = useMemo(() => ({
    labels: history.map((item) => item.date?.slice(5) || 'Log'),
    datasets: [
      {
        label: 'Daily kg CO2e',
        data: history.map((item) => item.total),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.14)',
        tension: 0.42,
        fill: true,
      },
      {
        label: 'Budget',
        data: history.map(() => budget),
        borderColor: '#a855f7',
        borderDash: [6, 6],
        pointRadius: 0,
      },
    ],
  }), [budget, history]);

  const barData = useMemo(() => ({
    labels: history.slice(-7).map((item) => item.date?.slice(5) || 'Log'),
    datasets: categories.map((category) => ({
      label: category.label,
      data: history.slice(-7).map((item) => item[category.key]),
      backgroundColor: category.color,
      borderRadius: 4,
    })),
  }), [history]);

  const doughnutData = {
    labels: categories.map((category) => category.label),
    datasets: [{
      data: categories.map((category) => latest[category.key] || 0),
      backgroundColor: categories.map((category) => category.color),
      borderWidth: 0,
    }],
  };

  const radarData = {
    labels: ['Transport', 'Food', 'Energy', 'Budget', 'Waste'],
    datasets: [{
      label: 'Sustainability score',
      data: [
        Math.max(20, 100 - latest.travel_emissions * 12),
        Math.max(20, 100 - latest.food_emissions * 10),
        Math.max(20, 100 - latest.energy_emissions * 14),
        Math.max(20, 120 - (latest.total / budget) * 100),
        latest.food_waste ? 35 : 95,
      ],
      backgroundColor: 'rgba(124, 58, 237, 0.14)',
      borderColor: '#7c3aed',
      pointBackgroundColor: '#7c3aed',
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { boxWidth: 10, usePointStyle: true } } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
  };

  const persistSettings = async (nextBudget) => {
    if (!userId) return;
    if (storageMode === 'app') {
      const localRecord = getLocalUserRecord(userId);
      upsertLocalUser({ ...(localRecord || {}), uid: userId, daily_budget: nextBudget });
      return;
    }
    if (firebaseEnabled && db) {
      await setDoc(doc(db, 'users', userId), { user_id: userId, daily_budget: nextBudget }, { merge: true });
    }
    api.updateSettings({ user_id: userId, daily_budget: nextBudget }).catch(() => {});
  };

  const handleBudgetChange = (value) => {
    const nextBudget = Number(value);
    setBudget(nextBudget);
    persistSettings(nextBudget).catch(() => setNotice('Budget changed locally. Cloud save needs active credentials.'));
  };

  const handleField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    setAuthLoading(true);
    setNotice('');

    try {
      if (!firebaseEnabled) {
        const uid = localUserId(authForm.email);
        const existing = getLocalUserRecord(uid);
        if (authMode === 'login' && (!existing || existing.password !== authForm.password)) {
          throw new Error('No in-app account found for this email and password. Register first or check the password.');
        }
        if (authMode === 'register' && existing) {
          throw new Error('This in-app account already exists. Switch to Login.');
        }
        const localUser = {
          uid,
          email: authForm.email.trim().toLowerCase(),
          displayName: authForm.name.trim() || existing?.displayName || authForm.email.trim(),
          password: authForm.password,
          daily_budget: existing?.daily_budget || budget,
          created_at: existing?.created_at || new Date().toISOString(),
          last_login_at: new Date().toISOString(),
          isLocal: true,
        };
        upsertLocalUser(localUser);
        api.upsertUser(localUser).catch(() => {});
        setCurrentUser(localUser);
        setUserId(uid);
        setStorageMode('app');
        setConnection('In-app database ready');
        setAuthForm({ name: '', email: '', password: '' });
        return;
      }

      let credential;
      if (authMode === 'register') {
        credential = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        if (authForm.name.trim()) {
          await updateProfile(credential.user, { displayName: authForm.name.trim() });
        }
        await setDoc(doc(db, 'users', credential.user.uid), {
          user_id: credential.user.uid,
          name: authForm.name.trim(),
          email: credential.user.email,
          daily_budget: budget,
          created_at: new Date().toISOString(),
        }, { merge: true });
        api.upsertUser({
          user_id: credential.user.uid,
          name: authForm.name.trim(),
          email: credential.user.email,
          daily_budget: budget,
        }).catch(() => {});
      } else {
        credential = await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
        await setDoc(doc(db, 'users', credential.user.uid), {
          user_id: credential.user.uid,
          email: credential.user.email,
          last_login_at: new Date().toISOString(),
        }, { merge: true });
        api.upsertUser({
          user_id: credential.user.uid,
          email: credential.user.email,
          last_login_at: new Date().toISOString(),
        }).catch(() => {});
      }

      const token = await credential.user.getIdToken();
      setApiAuthToken(token);
      setCurrentUser(credential.user);
      setUserId(credential.user.uid);
      setStorageMode('firebase');
      setConnection('Firestore realtime sync');
      setAuthForm({ name: '', email: '', password: '' });
    } catch (error) {
      if (error?.code === 'auth/api-key-not-valid') {
        const uid = localUserId(authForm.email);
        const existing = getLocalUserRecord(uid);
        if (authMode === 'login' && (!existing || existing.password !== authForm.password)) {
          setNotice(`${friendlyAuthError(error)} You can still use the in-app database by registering this email locally.`);
        } else if (authMode === 'register' && existing) {
          setNotice(`${friendlyAuthError(error)} This in-app account already exists. Switch to Login.`);
        } else {
          const localUser = {
            uid,
            email: authForm.email.trim().toLowerCase(),
            displayName: authForm.name.trim() || existing?.displayName || authForm.email.trim(),
            password: authForm.password,
            daily_budget: existing?.daily_budget || budget,
            created_at: existing?.created_at || new Date().toISOString(),
            last_login_at: new Date().toISOString(),
            isLocal: true,
          };
          upsertLocalUser(localUser);
          api.upsertUser(localUser).catch(() => {});
          setCurrentUser(localUser);
          setUserId(uid);
          setStorageMode('app');
          setConnection('In-app database ready');
          setAuthForm({ name: '', email: '', password: '' });
          setNotice('Firebase API key is invalid, so EcoTrack saved this account in the in-app database. Logs and recommendations will still persist in this browser.');
        }
      } else {
        setNotice(friendlyAuthError(error));
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (currentUser?.isLocal || !auth) {
      setCurrentUser(null);
      setUserId('');
      setHistory([]);
      setBadges([]);
      setStorageMode('app');
      setConnection(firebaseEnabled ? 'Waiting for secure login' : 'In-app database ready');
    } else {
      await signOut(auth);
    }
    setActiveView('dashboard');
    setNotice('');
  };

  const calculateAndLog = async (event) => {
    event.preventDefault();
    if (!userId) {
      setNotice('User session is still connecting. Try again in a moment.');
      return;
    }

    setLoading(true);
    setNotice('');

    const payload = {
      ...form,
      user_id: userId,
      distance: toNumber(form.distance),
      electricity_kwh: toNumber(form.electricity_kwh),
    };

    try {
      let calculation;
      try {
        const response = await api.calculateFootprint(payload);
        calculation = response.data;
      } catch {
        calculation = calculateFootprintLocally(payload);
      }

      const log = { ...payload, ...calculation, date: payload.date, updated_at: new Date().toISOString() };
      const nextHistory = [...history.filter((item) => item.date !== log.date), log].sort((a, b) => a.date.localeCompare(b.date));
      const nextBadges = evaluateBadges(nextHistory.slice(0, -1), log, badges);

      setHistory(nextHistory);
      setBadges(nextBadges);
      saveLocalLog(userId, log);
      saveLocalBadges(userId, nextBadges);

      api.logHabit(log).catch(() => {});
      api.updateBadges({ user_id: userId, badges: nextBadges }).catch(() => {});

      if (storageMode === 'firebase' && firebaseEnabled && db) {
        await setDoc(doc(db, 'logs', userId, 'daily', log.date), log, { merge: true });
        await setDoc(doc(db, 'badges', userId), { user_id: userId, badges: nextBadges }, { merge: true });
      }

      setActiveView('dashboard');
      setNotice(storageMode === 'firebase' ? 'Live footprint saved. Dashboards and badges are synced.' : 'Footprint saved inside the app database.');
      api.getHistory(userId).then((response) => {
        if (Array.isArray(response.data)) {
          setHistory(response.data.reverse());
        }
      }).catch(() => {});
    } catch (error) {
      setNotice(error.message || 'Could not save the footprint. Check the values and try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    setLoading(true);
    setActiveView('ai');
    try {
      const response = await api.generateSuggestions({ ...latest, ...latest.breakdown, user_id: userId });
      setSuggestions(response.data);
    } catch {
      setSuggestions(generateLocalRecommendations(latest, budget));
      setNotice('Recommendations generated inside the app because the AI service is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <AuthScreen
        authForm={authForm}
        authLoading={authLoading}
        authMode={authMode}
        notice={notice}
        onAuthFormChange={setAuthForm}
        onAuthModeChange={setAuthMode}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7ff] text-slate-950">
      <div className="border-b border-blue-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Realtime AI carbon intelligence</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">EcoTrack Personal Carbon AI</h1>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <nav className="flex flex-wrap gap-2">
              {[
                ['dashboard', 'Dashboard'],
                ['log', 'Log Today'],
                ['analytics', 'Analytics'],
                ['ai', 'AI Coach'],
                ['badges', 'Badges'],
                ['profile', 'Profile'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveView(id)}
                  className={classNames(
                    'h-10 rounded-md px-3 text-sm font-medium transition',
                    activeView === id
                      ? 'bg-gradient-to-r from-blue-700 to-violet-700 text-white shadow-sm'
                      : 'border border-blue-100 bg-white text-slate-700 hover:border-violet-400 hover:text-violet-700',
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>
            <button type="button" onClick={handleLogout} className="h-9 rounded-md border border-blue-100 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-violet-400 hover:text-violet-700">
              Logout
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8">
        <section className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="rounded-md border border-blue-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-blue-700">{syncLabel}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Live footprint command center</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Every saved habit log updates the calculator, cloud history, badges, budget progress, and AI recommendation context for the active user.
              </p>
            </div>
            <div className="rounded-md border border-violet-100 bg-gradient-to-br from-blue-700 to-violet-700 p-5 text-white shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Status</div>
              <div className="mt-2 text-lg font-semibold">{connection}</div>
              <div className="mt-1 text-xs text-blue-100">{currentUser.email || currentUser.displayName || `User ${userId.slice(0, 12)}`}</div>
            </div>
          </div>

          {notice && <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">{notice}</div>}

          {activeView === 'dashboard' && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Metric title="Today" value={`${latest.total?.toFixed?.(1) || '0.0'} kg`} caption={`${budgetUsed}% of daily budget`} tone="blue" />
                <Metric title="7-day total" value={`${weeklyTotal.toFixed(1)} kg`} caption="CO2e this week" tone="violet" />
                <Metric title="Daily average" value={`${average.toFixed(1)} kg`} caption="Across live records" tone="indigo" />
                <Metric title="Best day" value={`${bestDay?.total?.toFixed?.(1) || '0.0'} kg`} caption={bestDay?.date || 'Awaiting first log'} tone="sky" />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <Panel title="Footprint Trend" action={<button type="button" onClick={generateSuggestions} className="rounded-md bg-gradient-to-r from-blue-700 to-violet-700 px-3 py-2 text-sm font-semibold text-white">Generate AI Plan</button>}>
                  {history.length ? <div className="h-80"><Line data={lineData} options={chartOptions} /></div> : <EmptyState title="No carbon logs yet" text="Create today's log to activate trend analytics and AI coaching." />}
                </Panel>
                <Panel title="Today Breakdown">
                  {history.length ? (
                    <>
                      <div className="h-64"><Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom' } } }} /></div>
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        {categories.map((category) => (
                          <div key={category.key} className="rounded-md border border-blue-100 bg-white p-3">
                            <div className="text-xs text-slate-500">{category.label}</div>
                            <div className="mt-1 font-semibold">{(latest[category.key] || 0).toFixed(2)} kg</div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <EmptyState title="Breakdown pending" text="Travel, food, and energy totals appear after the first calculation." />}
                </Panel>
              </div>
            </>
          )}

          {activeView === 'log' && (
            <Panel title="Daily Habit Logger" subtitle="Enter travel, food, and household energy details to calculate and persist a user-scoped daily estimate.">
              <form onSubmit={calculateAndLog} className="grid gap-5 lg:grid-cols-3">
                <Field label="Date"><input type="date" value={form.date} onChange={(event) => handleField('date', event.target.value)} className="input" /></Field>
                <Field label="Transport mode">
                  <select value={form.transport_mode} onChange={(event) => handleField('transport_mode', event.target.value)} className="input">
                    {['Car Petrol', 'Car Diesel', 'Car Electric', 'Bus', 'Train', 'Motorcycle', 'Bicycle', 'Walking', 'Flight Short-haul', 'Flight Long-haul'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Distance traveled (km)"><input type="number" min="0" step="0.1" value={form.distance} onChange={(event) => handleField('distance', event.target.value)} className="input" /></Field>
                <Field label="Diet type">
                  <select value={form.diet_type} onChange={(event) => handleField('diet_type', event.target.value)} className="input">
                    {['Meat-heavy', 'Omnivore', 'Vegetarian', 'Vegan'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Electricity used (kWh)"><input type="number" min="0" step="0.1" value={form.electricity_kwh} onChange={(event) => handleField('electricity_kwh', event.target.value)} className="input" /></Field>
                <div className="grid gap-3 rounded-md border border-blue-100 bg-blue-50 p-4">
                  <Toggle checked={form.food_waste} onChange={(value) => handleField('food_waste', value)} label="Food waste today" />
                  <Toggle checked={form.heating} onChange={(value) => handleField('heating', value)} label="Heating used" />
                  <Toggle checked={form.ac} onChange={(value) => handleField('ac', value)} label="Air conditioning used" />
                </div>
                <div className="lg:col-span-3">
                  <button type="submit" disabled={loading || !userId} className="h-12 rounded-md bg-gradient-to-r from-blue-700 to-violet-700 px-6 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">
                    {loading ? 'Calculating...' : 'Calculate and Sync Log'}
                  </button>
                </div>
              </form>
            </Panel>
          )}

          {activeView === 'analytics' && (
            <div className="grid gap-6">
              <Panel title="Category Stack">
                {history.length ? <div className="h-80"><Bar data={barData} options={{ ...chartOptions, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true } } }} /></div> : <EmptyState title="Analytics waiting" text="Stacked category charts build from your live log history." />}
              </Panel>
              <Panel title="Sustainability Performance">
                {history.length ? <div className="h-80"><Radar data={radarData} options={{ responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, max: 100 } } }} /></div> : <EmptyState title="Performance score pending" text="The radar view needs at least one saved footprint calculation." />}
              </Panel>
            </div>
          )}

          {activeView === 'ai' && (
            <Panel title="AI Eco-Friendly Suggestion Engine" subtitle="Groq LLaMA 3.3 70B analyzes the latest footprint pattern and returns structured carbon reduction actions.">
              <button type="button" onClick={generateSuggestions} disabled={loading} className="mb-5 rounded-md bg-gradient-to-r from-blue-700 to-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {loading ? 'Generating...' : 'Refresh Recommendations'}
              </button>
              <div className="grid gap-4 md:grid-cols-3">
                {(suggestions.length ? suggestions : [
                  { title: 'Log your current day', description: 'AI coaching starts after EcoTrack has a saved travel, food, and energy footprint to analyze.', category: 'AI Coach', estimated_co2_saving: 'Live after first log' },
                  { title: 'Save every record inside the app', description: 'EcoTrack preserves logs, badges, and budget settings in the app database, then syncs to Firestore when Firebase is valid.', category: 'Storage', estimated_co2_saving: 'Continuous' },
                  { title: 'Set a personal budget', description: 'Budget targets give the model a concrete threshold for reduction plans.', category: 'Planning', estimated_co2_saving: 'Measurable' },
                ]).map((item) => (
                  <article key={item.title} className="rounded-md border border-blue-100 bg-white p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{item.category}</div>
                    <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    <div className="mt-4 rounded-md bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-900">{item.estimated_co2_saving}</div>
                  </article>
                ))}
              </div>
            </Panel>
          )}

          {activeView === 'badges' && (
            <Panel title="Achievement and Badge System" subtitle="Badges are awarded from carbon budget, travel mode, energy, waste, and logging consistency.">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {badgeCatalog.map((badge) => {
                  const earned = badges.find((item) => item.id === badge.id);
                  return (
                    <div key={badge.id} className={classNames('rounded-md border p-4', earned ? 'border-violet-200 bg-violet-50' : 'border-blue-100 bg-white')}>
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-blue-700 to-violet-700 text-sm font-bold text-white">{badge.name.slice(0, 2)}</div>
                      <h3 className="mt-3 font-semibold">{badge.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{badge.detail}</p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{earned ? `Earned ${earned.dateEarned?.slice(0, 10)}` : 'Locked'}</p>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {activeView === 'profile' && (
            <Panel title="Profile, Budget and Cloud Setup" subtitle="Tune your daily carbon budget and confirm the production services required by the architecture.">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700" htmlFor="budget">Daily budget: {budget.toFixed(1)} kg CO2e</label>
                  <input id="budget" type="range" min="3" max="15" step="0.5" value={budget} onChange={(event) => handleBudgetChange(event.target.value)} className="mt-4 w-full accent-violet-700" />
                  <div className="mt-4 rounded-md bg-blue-50 p-4 text-sm leading-6 text-slate-700">EcoTrack saves all records inside the app database first, then syncs to Firebase Authentication, Firestore, Flask, Groq AI, and Carbon Interface when those services are configured.</div>
                  <div className="mt-4 rounded-md border border-blue-100 bg-white p-4 text-sm leading-6 text-slate-700">
                    <div className="font-semibold text-slate-900">Signed in user</div>
                    <div>{currentUser.email}</div>
                    <div className="text-xs text-slate-500">UID: {userId}</div>
                  </div>
                </div>
                <div className="rounded-md border border-blue-100 bg-white p-4">
                  <h3 className="font-semibold">Realtime deployment checklist</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>Set Firebase web keys in <code>frontend/.env</code>.</li>
                    <li>Add Firebase Admin credentials at <code>backend/serviceAccountKey.json</code>.</li>
                    <li>Set Groq and Carbon Interface API keys in <code>backend/.env</code>.</li>
                    <li>Deploy Flask and point <code>VITE_BACKEND_URL</code> to the API URL.</li>
                  </ul>
                </div>
              </div>
            </Panel>
          )}
        </section>

        <aside className="space-y-6">
          <Panel title="Carbon Budget">
            <div className="relative h-36">
              <div className="absolute inset-x-0 bottom-0 h-4 rounded-full bg-blue-100" />
              <div className="absolute bottom-0 left-0 h-4 rounded-full bg-gradient-to-r from-blue-700 to-violet-700 transition-all" style={{ width: `${budgetUsed}%` }} />
              <div className="pt-4 text-center">
                <div className="text-5xl font-semibold tracking-tight">{budgetUsed}%</div>
                <p className="mt-2 text-sm text-slate-600">of {budget.toFixed(1)} kg daily budget</p>
              </div>
            </div>
          </Panel>
          <Panel title="Environmental Impact">
            <div className="space-y-3 text-sm">
              <Impact label="Trees needed for latest day" value={`${Math.max(0, Math.ceil((latest.total || 0) / 0.06))}`} />
              <Impact label="Car-km equivalent saved" value={`${history.length > 1 ? Math.max(0, ((history[0]?.total || latest.total) - latest.total) / 0.192).toFixed(1) : '0.0'} km`} />
              <Impact label="Budget wins" value={`${history.filter((item) => item.total <= budget).length}/${history.length}`} />
            </div>
          </Panel>
          <Panel title="Recent Logs">
            {history.length ? (
              <div className="space-y-3">
                {history.slice(-5).reverse().map((item) => (
                  <div key={item.date} className="flex items-center justify-between rounded-md border border-blue-100 bg-white p-3">
                    <div>
                      <div className="font-semibold">{item.date}</div>
                      <div className="text-xs text-slate-500">{item.transport_mode} - {item.diet_type}</div>
                    </div>
                    <div className="font-semibold">{item.total.toFixed(1)} kg</div>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="No records" text="Saved logs will stream into this panel." compact />}
          </Panel>
        </aside>
      </main>
    </div>
  );
}

function Panel({ title, subtitle, action, children }) {
  return (
    <section className="rounded-md border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({ title, value, caption, tone }) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50',
    violet: 'border-violet-200 bg-violet-50',
    indigo: 'border-indigo-200 bg-indigo-50',
    sky: 'border-sky-200 bg-sky-50',
  };
  return (
    <div className={classNames('rounded-md border p-4', tones[tone])}>
      <div className="text-sm font-medium text-slate-600">{title}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{caption}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-violet-700" />
    </label>
  );
}

function Impact({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-blue-50 pb-2 last:border-0 last:pb-0">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function EmptyState({ title, text, compact = false }) {
  return (
    <div className={classNames('flex flex-col justify-center rounded-md border border-dashed border-blue-200 bg-blue-50/60 text-center', compact ? 'min-h-28 p-4' : 'min-h-64 p-8')}>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function AuthScreen({ authForm, authLoading, authMode, notice, onAuthFormChange, onAuthModeChange, onSubmit }) {
  const isRegister = authMode === 'register';

  const updateField = (field, value) => {
    onAuthFormChange((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-[#f6f7ff] px-4 py-8 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-md border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Secure carbon intelligence</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">EcoTrack Personal Carbon AI</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Sign in to preserve carbon logs, budgets, achievements, and AI recommendations inside the app database, with Firestore sync when Firebase is valid.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
              <div className="text-2xl font-semibold text-blue-800">Auth</div>
              <p className="mt-2 text-sm text-slate-600">Firebase login or in-app account.</p>
            </div>
            <div className="rounded-md border border-violet-100 bg-violet-50 p-4">
              <div className="text-2xl font-semibold text-violet-800">DB</div>
              <p className="mt-2 text-sm text-slate-600">App database plus Firestore sync.</p>
            </div>
            <div className="rounded-md border border-indigo-100 bg-indigo-50 p-4">
              <div className="text-2xl font-semibold text-indigo-800">Live</div>
              <p className="mt-2 text-sm text-slate-600">Realtime dashboard listeners.</p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex rounded-md bg-blue-50 p-1">
            <button
              type="button"
              onClick={() => onAuthModeChange('login')}
              className={classNames('h-10 flex-1 rounded-md text-sm font-semibold', !isRegister ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600')}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => onAuthModeChange('register')}
              className={classNames('h-10 flex-1 rounded-md text-sm font-semibold', isRegister ? 'bg-white text-violet-800 shadow-sm' : 'text-slate-600')}
            >
              Register
            </button>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">{isRegister ? 'Create your account' : 'Welcome back'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isRegister ? 'Your profile, logs, badges, and budget will be preserved in the app database.' : 'Log in to load preserved sustainability records.'}
          </p>

          {notice && <div className="mt-5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">{notice}</div>}

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            {isRegister && (
              <Field label="Full name">
                <input
                  required
                  className="input"
                  value={authForm.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Your name"
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                required
                className="input"
                type="email"
                value={authForm.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <input
                required
                className="input"
                minLength={6}
                type="password"
                value={authForm.password}
                onChange={(event) => updateField('password', event.target.value)}
                placeholder="At least 6 characters"
              />
            </Field>
            <button
              type="submit"
              disabled={authLoading}
              className="mt-2 h-12 rounded-md bg-gradient-to-r from-blue-700 to-violet-700 px-6 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
            >
              {authLoading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Login'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function SetupRequired() {
  return (
    <div className="min-h-screen bg-[#f6f7ff] px-4 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center">
        <section className="rounded-md border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Firebase required</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Connect authentication before running EcoTrack</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Add Firebase web credentials to <code>frontend/.env</code>, enable Email/Password sign-in in Firebase Authentication, and create a Firestore database. Then restart Vite to use login, preserved logs, badges, and realtime records.
          </p>
          <div className="mt-6 rounded-md bg-blue-50 p-4 text-sm leading-7 text-slate-700">
            Required frontend keys: <code>VITE_FIREBASE_API_KEY</code>, <code>VITE_FIREBASE_AUTH_DOMAIN</code>, and <code>VITE_FIREBASE_PROJECT_ID</code>.
          </div>
          <div className="mt-4 rounded-md border border-blue-100 bg-white p-4 text-sm leading-7 text-slate-700">
            Current config status: API key {firebaseConfigStatus.hasApiKey ? 'present' : 'missing'}, auth domain {firebaseConfigStatus.hasAuthDomain ? 'present' : 'missing'}, project id {firebaseConfigStatus.hasProjectId ? firebaseConfigStatus.projectId : 'missing'}.
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
