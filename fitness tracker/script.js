let workouts = JSON.parse(localStorage.getItem('ft_workouts'))  || [];
let activities = JSON.parse(localStorage.getItem('ft_activities')) || [];
let meals      = JSON.parse(localStorage.getItem('ft_meals'))     || [];
let calGoal    = parseInt(localStorage.getItem('ft_calgoal'))     || 2000;
 
// Chart instances
let stepsChart  = null;
let weightChart = null;
let calChart    = null;
 
// ===================================================
//  INITIALISE
// ===================================================
window.addEventListener('DOMContentLoaded', () => {
  const today = todayStr();
  document.getElementById('ex-date').value  = today;
  document.getElementById('meal-date').value = today;
  document.getElementById('cal-goal').value  = calGoal;
 
  const todayAct = activities.find(a => a.date === today) || {};
  if (todayAct.steps)  document.getElementById('act-steps').value  = todayAct.steps;
  if (todayAct.water)  document.getElementById('act-water').value  = todayAct.water;
  if (todayAct.sleep)  document.getElementById('act-sleep').value  = todayAct.sleep;
  if (todayAct.weight) document.getElementById('act-weight').value = todayAct.weight;
 
  renderAll();
});
 
// ===================================================
//  TAB SWITCHING
// ===================================================
function showTab(tabName, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
  el.classList.add('active');
  setTimeout(renderCharts, 80);
  if (tabName === 'diet') renderMealsToday();
}
 
// ===================================================
//  STREAK COUNTER
// ===================================================
function calcStreak() {
  if (workouts.length === 0) return 0;
 
  // Get unique workout dates sorted latest first
  const dates = [...new Set(workouts.map(w => w.date))].sort().reverse();
 
  const today     = todayStr();
  const yesterday = daysAgoStr(1);
 
  // Streak only valid if worked out today or yesterday
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
 
  let streak = 0;
  for (let i = 0; i < dates.length; i++) {
    const expected = daysAgoStr(i);
    if (dates[i] === expected) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
 
// ===================================================
//  SAVE — WORKOUT
// ===================================================
function saveWorkout() {
  const name = document.getElementById('ex-name').value.trim();
  if (!name) { alert('Please enter an exercise name.'); return; }
 
  const workout = {
    id:       Date.now(),
    name:     name,
    category: document.getElementById('ex-cat').value,
    duration: parseFloat(document.getElementById('ex-dur').value)  || 0,
    sets:     parseInt(document.getElementById('ex-sets').value)   || 0,
    reps:     parseInt(document.getElementById('ex-reps').value)   || 0,
    calories: parseInt(document.getElementById('ex-cal').value)    || 0,
    date:     document.getElementById('ex-date').value,
    notes:    document.getElementById('ex-notes').value.trim()
  };
 
  workouts.unshift(workout);
  saveToStorage();
  flash('save-msg');
  clearWorkoutForm();
  renderAll();
}
 
function clearWorkoutForm() {
  ['ex-name', 'ex-dur', 'ex-sets', 'ex-reps', 'ex-cal', 'ex-notes']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('ex-cat').value = 'strength';
}
 
function deleteWorkout(id) {
  workouts = workouts.filter(w => w.id !== id);
  saveToStorage();
  renderAll();
}
 
function clearWorkouts() {
  if (!confirm('Delete ALL workout history? This cannot be undone.')) return;
  workouts = [];
  saveToStorage();
  renderAll();
}
 
// ===================================================
//  SAVE — ACTIVITY
// ===================================================
function saveActivity() {
  const today = todayStr();
  const entry = {
    date:   today,
    steps:  parseInt(document.getElementById('act-steps').value)   || 0,
    water:  parseInt(document.getElementById('act-water').value)   || 0,
    sleep:  parseFloat(document.getElementById('act-sleep').value) || 0,
    weight: parseFloat(document.getElementById('act-weight').value)|| 0
  };
 
  const idx = activities.findIndex(a => a.date === today);
  if (idx >= 0) activities[idx] = entry;
  else activities.unshift(entry);
 
  saveToStorage();
  flash('act-msg');
  renderAll();
}
 
// ===================================================
//  SAVE — CALORIE GOAL
// ===================================================
function saveCalGoal() {
  calGoal = parseInt(document.getElementById('cal-goal').value) || 2000;
  localStorage.setItem('ft_calgoal', calGoal);
  flash('goal-msg');
  renderAll();
}
 
// ===================================================
//  SAVE — MEAL
// ===================================================
function saveMeal() {
  const name = document.getElementById('meal-name').value.trim();
  if (!name) { alert('Please enter a food item.'); return; }
 
  const meal = {
    id:       Date.now(),
    name:     name,
    calories: parseInt(document.getElementById('meal-cal').value)    || 0,
    type:     document.getElementById('meal-type').value,
    protein:  parseInt(document.getElementById('meal-protein').value) || 0,
    date:     document.getElementById('meal-date').value
  };
 
  meals.unshift(meal);
  saveToStorage();
  flash('meal-msg');
  ['meal-name', 'meal-cal', 'meal-protein'].forEach(id => document.getElementById(id).value = '');
  renderMealsToday();
  renderAll();
}
 
function deleteMeal(id) {
  meals = meals.filter(m => m.id !== id);
  saveToStorage();
  renderMealsToday();
  renderAll();
}
 
function clearMeals() {
  if (!confirm('Delete ALL meal history? This cannot be undone.')) return;
  meals = [];
  saveToStorage();
  renderMealsToday();
  renderAll();
}
 
// ===================================================
//  BMI CALCULATOR
// ===================================================
function calcBMI() {
  const weight   = parseFloat(document.getElementById('bmi-weight').value);
  const heightCm = parseFloat(document.getElementById('bmi-height').value);
  if (!weight || !heightCm) { alert('Please enter both weight and height.'); return; }
 
  const heightM    = heightCm / 100;
  const bmi        = weight / (heightM * heightM);
  const bmiRounded = Math.round(bmi * 10) / 10;
 
  let category, bg, textColor;
  if (bmi < 18.5) {
    category = 'Underweight';   bg = '#ebf8ff'; textColor = '#2b6cb0';
  } else if (bmi < 25) {
    category = 'Normal Weight'; bg = '#f0fff4'; textColor = '#276749';
  } else if (bmi < 30) {
    category = 'Overweight';    bg = '#fffbeb'; textColor = '#b7791f';
  } else {
    category = 'Obese';         bg = '#fff5f5'; textColor = '#c53030';
  }
 
  const idealLow  = Math.round(18.5 * heightM * heightM * 10) / 10;
  const idealHigh = Math.round(24.9 * heightM * heightM * 10) / 10;
  document.getElementById('ideal-weight').innerHTML =
    `For your height (<strong>${heightCm} cm</strong>), ideal weight is <strong>${idealLow}–${idealHigh} kg</strong> (BMI 18.5–24.9).`;
 
  document.getElementById('bmi-result').innerHTML = `
    <div class="bmi-result-box" style="background:${bg}">
      <div class="bmi-number" style="color:${textColor}">${bmiRounded}</div>
      <div class="bmi-category" style="color:${textColor}">${category}</div>
      <div class="bmi-sub" style="color:${textColor}">Height: ${heightCm} cm &nbsp;·&nbsp; Weight: ${weight} kg</div>
    </div>
  `;
}
 
// ===================================================
//  RENDER — ALL
// ===================================================
function renderAll() {
  renderDashboard();
  renderHistoryList();
  renderMealHistoryList();
  renderCharts();
}
 
// ===================================================
//  RENDER — DASHBOARD
// ===================================================
function renderDashboard() {
  const today   = todayStr();
  const weekAgo = daysAgoStr(7);
 
  const weekWorkouts = workouts.filter(w => w.date >= weekAgo);
  const todayAct     = activities.find(a => a.date === today) || {};
  const todayMeals   = meals.filter(m => m.date === today);
  const todayCal     = todayMeals.reduce((s, m) => s + m.calories, 0);
  const weekBurned   = weekWorkouts.reduce((s, w) => s + w.calories, 0);
  const weekMinutes  = weekWorkouts.reduce((s, w) => s + w.duration, 0);
  const streak       = calcStreak();
 
  // Metric cards — now includes streak!
  document.getElementById('metrics').innerHTML = `
    <div class="metric">
      <div class="metric-label">Workouts / week</div>
      <div class="metric-val">${weekWorkouts.length}</div>
      <div class="metric-unit">sessions</div>
    </div>
    <div class="metric">
      <div class="metric-label">Calories burned</div>
      <div class="metric-val">${weekBurned.toLocaleString()}</div>
      <div class="metric-unit">kcal this week</div>
    </div>
    <div class="metric">
      <div class="metric-label">Active minutes</div>
      <div class="metric-val">${weekMinutes}</div>
      <div class="metric-unit">min this week</div>
    </div>
    <div class="metric">
      <div class="metric-label">Eaten today</div>
      <div class="metric-val">${todayCal.toLocaleString()}</div>
      <div class="metric-unit">/ ${calGoal} kcal</div>
    </div>
    <div class="metric">
      <div class="metric-label">Steps today</div>
      <div class="metric-val">${(todayAct.steps || 0).toLocaleString()}</div>
      <div class="metric-unit">steps</div>
    </div>
    <div class="metric" style="border: 2px solid ${streak > 0 ? '#f6ad55' : '#e2e8f0'}">
      <div class="metric-label">Workout streak</div>
      <div class="metric-val">${streak > 0 ? '🔥' : '💔'} ${streak}</div>
      <div class="metric-unit">${streak === 0 ? 'Start today!' : streak === 1 ? 'Great start!' : 'Day streak! Keep going!'}</div>
    </div>
  `;
 
  // Goal progress bars
  const goals = [
    { label: 'Workouts this week',   val: weekWorkouts.length, max: 5 },
    { label: 'Steps today',           val: todayAct.steps || 0, max: 10000 },
    { label: 'Calories today',        val: todayCal,            max: calGoal },
    { label: 'Water today (glasses)', val: todayAct.water || 0, max: 8 },
  ];
 
  document.getElementById('goals-section').innerHTML = goals.map(g => {
    const pct  = Math.min(100, Math.round((g.val / g.max) * 100));
    const over = g.val > g.max;
    return `
      <div class="goal-row">
        <span>${g.label} — ${g.val.toLocaleString()} / ${g.max.toLocaleString()}</span>
        <span class="goal-pct">${pct}%</span>
      </div>
      <div class="progress-wrap">
        <div class="progress-bar ${over ? 'over' : ''}" style="width:${pct}%"></div>
      </div>
    `;
  }).join('');
 
  // Recent workouts (last 3)
  const recent = workouts.slice(0, 3);
  document.getElementById('recent-list').innerHTML = recent.length
    ? recent.map(w => workoutItemHTML(w)).join('')
    : '<div class="empty">No workouts yet. Head to Log Workout to add one!</div>';
}
 
// ===================================================
//  RENDER — TODAY'S MEALS
// ===================================================
function renderMealsToday() {
  const today      = todayStr();
  const todayMeals = meals.filter(m => m.date === today);
  const totalCal   = todayMeals.reduce((s, m) => s + m.calories, 0);
  const totalProt  = todayMeals.reduce((s, m) => s + m.protein, 0);
  const pct        = Math.min(100, Math.round((totalCal / calGoal) * 100));
 
  if (!todayMeals.length) {
    document.getElementById('meals-today').innerHTML = '<div class="empty">No meals logged today.</div>';
    return;
  }
 
  document.getElementById('meals-today').innerHTML = `
    <div class="goal-row">
      <span>Total: ${totalCal} / ${calGoal} kcal &nbsp;·&nbsp; Protein: ${totalProt}g</span>
      <span class="goal-pct">${pct}%</span>
    </div>
    <div class="progress-wrap">
      <div class="progress-bar ${totalCal > calGoal ? 'over' : ''}" style="width:${pct}%"></div>
    </div>
    ${todayMeals.map(m => `
      <div class="log-item">
        <div class="log-icon">${mealEmoji(m.type)}</div>
        <div class="log-info">
          <div class="log-name">${m.name}<span class="badge ${m.type}">${m.type}</span></div>
          <div class="log-meta">${m.calories} kcal${m.protein ? ' · ' + m.protein + 'g protein' : ''}</div>
        </div>
        <button class="btn danger" onclick="deleteMeal(${m.id})">🗑️</button>
      </div>
    `).join('')}
  `;
}
 
// ===================================================
//  RENDER — HISTORY LISTS
// ===================================================
function renderHistoryList() {
  document.getElementById('history-list').innerHTML = workouts.length
    ? workouts.map(w => `
        <div class="log-item">
          <div class="log-icon">${catEmoji(w.category)}</div>
          <div class="log-info">
            <div class="log-name">${w.name}<span class="badge ${w.category}">${w.category}</span></div>
            <div class="log-meta">${w.date}${w.duration ? ' · ' + w.duration + ' min' : ''}${w.sets ? ' · ' + w.sets + '×' + w.reps + ' reps' : ''}${w.calories ? ' · ' + w.calories + ' kcal' : ''}${w.notes ? ' · ' + w.notes : ''}</div>
          </div>
          <button class="btn danger" onclick="deleteWorkout(${w.id})">🗑️</button>
        </div>
      `).join('')
    : '<div class="empty">No workouts logged yet.</div>';
}
 
function renderMealHistoryList() {
  document.getElementById('meal-history').innerHTML = meals.length
    ? meals.map(m => `
        <div class="log-item">
          <div class="log-icon">${mealEmoji(m.type)}</div>
          <div class="log-info">
            <div class="log-name">${m.name}<span class="badge ${m.type}">${m.type}</span></div>
            <div class="log-meta">${m.date} · ${m.calories} kcal${m.protein ? ' · ' + m.protein + 'g protein' : ''}</div>
          </div>
          <button class="btn danger" onclick="deleteMeal(${m.id})">🗑️</button>
        </div>
      `).join('')
    : '<div class="empty">No meals logged yet.</div>';
}
 
// ===================================================
//  RENDER — CHARTS
// ===================================================
function renderCharts() {
  renderStepsChart();
  renderWeightChart();
  renderCalWeekChart();
}
 
function renderStepsChart() {
  const canvas = document.getElementById('stepsChart');
  if (!canvas) return;
  const labels = [], data = [];
  for (let i = 6; i >= 0; i--) {
    const d   = daysAgoStr(i);
    const act = activities.find(a => a.date === d);
    labels.push(shortDay(d));
    data.push(act ? act.steps : 0);
  }
  if (stepsChart) stepsChart.destroy();
  stepsChart = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Steps', data, backgroundColor: '#63b3ed', borderRadius: 5 }] },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => v >= 1000 ? Math.round(v / 1000) + 'k' : v } },
        x: { grid: { display: false } }
      }
    }
  });
}
 
function renderWeightChart() {
  const canvas = document.getElementById('weightChart');
  if (!canvas) return;
  const pts = activities.filter(a => a.weight > 0).slice(0, 14).reverse();
  if (weightChart) weightChart.destroy();
  weightChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: pts.map(a => a.date.slice(5)),
      datasets: [{
        label: 'Weight (kg)', data: pts.map(a => a.weight),
        borderColor: '#3182ce', backgroundColor: 'rgba(49,130,206,0.1)',
        tension: 0.35, fill: true, pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: false },
        x: { grid: { display: false }, ticks: { maxTicksLimit: 7 } }
      }
    }
  });
}
 
function renderCalWeekChart() {
  const canvas = document.getElementById('calChart');
  if (!canvas) return;
  const labels = [], data = [];
  for (let i = 6; i >= 0; i--) {
    const d        = daysAgoStr(i);
    const dayMeals = meals.filter(m => m.date === d);
    labels.push(shortDay(d));
    data.push(dayMeals.reduce((s, m) => s + m.calories, 0));
  }
  if (calChart) calChart.destroy();
  calChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'kcal', data,
        backgroundColor: data.map(v => v > calGoal ? '#fc8181' : '#68d391'),
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
        x: { grid: { display: false } }
      }
    }
  });
}
 
// ===================================================
//  HELPERS
// ===================================================
function workoutItemHTML(w) {
  return `
    <div class="log-item">
      <div class="log-icon">${catEmoji(w.category)}</div>
      <div class="log-info">
        <div class="log-name">${w.name}<span class="badge ${w.category}">${w.category}</span></div>
        <div class="log-meta">${w.date}${w.duration ? ' · ' + w.duration + ' min' : ''}${w.sets ? ' · ' + w.sets + '×' + w.reps + ' reps' : ''}${w.calories ? ' · ' + w.calories + ' kcal' : ''}</div>
      </div>
    </div>
  `;
}
 
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
 
function daysAgoStr(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}
 
function shortDay(dateStr) {
  return new Date(dateStr).toLocaleDateString('en', { weekday: 'short' });
}
 
function flash(id) {
  const el = document.getElementById(id);
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 2500);
}
 
function saveToStorage() {
  localStorage.setItem('ft_workouts',   JSON.stringify(workouts));
  localStorage.setItem('ft_activities', JSON.stringify(activities));
  localStorage.setItem('ft_meals',      JSON.stringify(meals));
}
 
function catEmoji(cat) {
  return { strength: '🏋️', cardio: '🏃', flexibility: '🧘', sports: '⚽' }[cat] || '💪';
}
 
function mealEmoji(type) {
  return { breakfast: '☕', lunch: '🥗', dinner: '🍽️', snack: '🍎' }[type] || '🥘';
}