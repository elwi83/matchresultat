const series = window.MATCH_SERIES;

const seriesSelect = document.querySelector("#series-select");
const standingsBody = document.querySelector("#standings-body");
const matchesList = document.querySelector("#matches-list");
const tabs = document.querySelectorAll(".tab");
const loginScreen = document.querySelector("#login-screen");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const siteContent = document.querySelector("#site-content");
const logoutButton = document.querySelector("#logout-button");
const resultDialog = document.querySelector("#result-dialog");
const resultForm = document.querySelector("#result-form");
const deleteResultButton = document.querySelector("#delete-result");
const supabaseClient = window.supabase.createClient(
  window.APP_CONFIG.supabaseUrl,
  window.APP_CONFIG.supabasePublishableKey,
);
const loginEmail = "torpet15@elwi83.se";
let activeSeries = Object.keys(series)[0];
let activeTab = "results";
let editingMatchNumber = null;
let savedResults = {};

function showSite() {
  document.body.classList.remove("locked");
  loginScreen.hidden = true;
  siteContent.setAttribute("aria-hidden", "false");
}

function showLogin() {
  document.body.classList.add("locked");
  loginScreen.hidden = false;
  siteContent.setAttribute("aria-hidden", "true");
  loginForm.reset();
  loginError.textContent = "";
  document.querySelector("#username").focus();
}

async function loadRemoteResults() {
  const { data, error } = await supabaseClient
    .from("match_results")
    .select("match_number, home_score, away_score");

  if (error) {
    console.error("Kunde inte hämta resultat från Supabase.", error);
    loginError.textContent = "Kunde inte hämta resultaten. Försök igen.";
    return false;
  }

  savedResults = Object.fromEntries(
    data.map((result) => [
      result.match_number,
      { home: result.home_score, away: result.away_score },
    ]),
  );
  return true;
}

async function openAuthenticatedSite() {
  if (!(await loadRemoteResults())) {
    await supabaseClient.auth.signOut();
    return;
  }

  showSite();
  renderAll();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const username = formData.get("username");
  const password = formData.get("password");
  const submitButton = loginForm.querySelector('button[type="submit"]');

  if (username !== "Torpet15") {
    loginError.textContent = "Fel användarnamn eller lösenord.";
    document.querySelector("#password").value = "";
    document.querySelector("#password").focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Loggar in…";
  loginError.textContent = "";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: loginEmail,
    password,
  });

  submitButton.disabled = false;
  submitButton.textContent = "Logga in";

  if (error) {
    console.error("Supabase-inloggningen misslyckades.", error);
    loginError.textContent = "Fel användarnamn eller lösenord.";
    document.querySelector("#password").value = "";
    document.querySelector("#password").focus();
    return;
  }

  await openAuthenticatedSite();
});

logoutButton.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error("Utloggningen misslyckades.", error);
    window.alert("Det gick inte att logga ut. Försök igen.");
    return;
  }

  savedResults = {};
  showLogin();
});

function teamById(data, id) {
  return data.teams.find((team) => team.id === id);
}

const teamAppearances = [
  { prefix: "Farsta", background: "#171717", text: "#ffffff" },
  { prefix: "Sköndals", background: "#3987c9", text: "#111111", short: "SIK" },
  { prefix: "Segeltorps", background: "#142f63", text: "#ffffff", short: "SIBK" },
  { prefix: "FBI Tullinge", background: "#f28c28", text: "#111111", short: "FBI" },
  { prefix: "Tumba", background: "#d92d32", text: "#111111" },
  { prefix: "Värmdö", background: "#3987c9", text: "#ffffff" },
  { prefix: "Salems", background: "#743b8f", text: "#ffffff" },
  {
    prefix: "Nacka",
    background: "#ffffff",
    text: "#111111",
    border: "#b8bdb9",
  },
  { prefix: "Tyresö Trollbäcken", background: "#171717", text: "#ef3340" },
  { prefix: "Huddinge", background: "#d92d32", text: "#ffffff" },
  { prefix: "Älta", background: "#171717", text: "#ffd84d" },
  { prefix: "Älvsjö", background: "#142f63", text: "#ffffff" },
  { prefix: "Ingarö", background: "#171717", text: "#ffd84d" },
  { prefix: "Hammarby", background: "#14783f", text: "#ffffff" },
];

function badge(team) {
  const appearance = teamAppearances.find(({ prefix }) => team.name.startsWith(prefix));
  const background = appearance?.background ?? team.color;
  const text = appearance?.text ?? "#ffffff";
  const border = appearance?.border ?? background;
  const short = appearance?.short ?? team.short;

  return `
    <span
      class="team-badge"
      style="--team-color:${background};--team-text-color:${text};--team-border-color:${border}"
    >${short}</span>`;
}

function getMatchResult(match) {
  if (Number.isInteger(match[2]) && Number.isInteger(match[3])) {
    return { home: match[2], away: match[3] };
  }

  const stored = savedResults[match[7]];
  if (
    stored &&
    Number.isInteger(stored.home) &&
    stored.home >= 0 &&
    Number.isInteger(stored.away) &&
    stored.away >= 0
  ) {
    return stored;
  }

  return null;
}

function calculateStandings(data) {
  const table = data.teams.map((team) => ({
    ...team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    form: [],
  }));

  const getTeam = (id) => table.find((team) => team.id === id);

  data.games.forEach((match) => {
    const [homeId, awayId] = match;
    const result = getMatchResult(match);
    if (!result) return;

    const { home: homeGoals, away: awayGoals } = result;
    const home = getTeam(homeId);
    const away = getTeam(awayId);
    home.played += 1;
    away.played += 1;
    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
      home.form.push("V");
      away.form.push("F");
    } else if (homeGoals < awayGoals) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
      away.form.push("V");
      home.form.push("F");
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
      home.form.push("O");
      away.form.push("O");
    }
  });

  return table.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor,
  );
}

function positionClass(index, total) {
  return "";
}

function renderStandings() {
  const data = series[activeSeries];
  const standings = calculateStandings(data);

  standingsBody.innerHTML = standings
    .map((team, index) => {
      const goalDifference = team.goalsFor - team.goalsAgainst;
      const form = team.form
        .slice(-5)
        .map((result) => {
          const className = result === "V" ? "win" : result === "O" ? "draw" : "loss";
          return `<i class="${className}" title="${result === "V" ? "Vinst" : result === "O" ? "Oavgjort" : "Förlust"}">${result}</i>`;
        })
        .join("");

      return `
        <tr>
          <td class="position ${positionClass(index, standings.length)}">${index + 1}</td>
          <td><span class="team">${badge(team)}${team.name}</span></td>
          <td>${team.played}</td>
          <td>${team.wins}</td>
          <td>${team.draws}</td>
          <td>${team.losses}</td>
          <td>${team.goalsFor}–${team.goalsAgainst}</td>
          <td>${goalDifference > 0 ? "+" : ""}${goalDifference}</td>
          <td class="points">${team.points}</td>
          <td><span class="form">${form}</span></td>
        </tr>`;
    })
    .join("");

  const completedGames = data.games.filter((game) => getMatchResult(game));
  const totalGoals = completedGames.reduce((sum, game) => {
    const result = getMatchResult(game);
    return sum + result.home + result.away;
  }, 0);
  document.querySelector("#stat-teams").textContent = data.teams.length;
  document.querySelector("#stat-games").textContent = completedGames.length;
  document.querySelector("#stat-goals").textContent = totalGoals;
  document.querySelector("#stat-average").textContent = completedGames.length
    ? (totalGoals / completedGames.length).toFixed(1).replace(".", ",")
    : "–";
}

function calculateMatchAnalytics(data) {
  const analytics = {
    largeDifferenceTotal: 0,
    segeltorpLargeTotal: 0,
    segeltorpLargeWins: 0,
    segeltorpLargeLosses: 0,
    segeltorpCloseTotal: 0,
    segeltorpCloseWins: 0,
    segeltorpCloseLosses: 0,
    segeltorpCloseDraws: 0,
    segeltorpUnevenLosses: 0,
  };
  const segeltorp = data.teams.find((team) => team.name.startsWith("Segeltorps IF IBF"));

  data.games.forEach((match) => {
    const result = getMatchResult(match);
    if (!result) return;

    const difference = Math.abs(result.home - result.away);
    if (difference > 10) analytics.largeDifferenceTotal += 1;

    const isHome = match[0] === segeltorp?.id;
    const isAway = match[1] === segeltorp?.id;
    if (!isHome && !isAway) return;

    const segeltorpGoals = isHome ? result.home : result.away;
    const opponentGoals = isHome ? result.away : result.home;

    if (difference > 10) {
      analytics.segeltorpLargeTotal += 1;
      if (segeltorpGoals > opponentGoals) analytics.segeltorpLargeWins += 1;
      if (segeltorpGoals < opponentGoals) analytics.segeltorpLargeLosses += 1;
    }

    if (difference <= 3) {
      analytics.segeltorpCloseTotal += 1;
      if (segeltorpGoals > opponentGoals) analytics.segeltorpCloseWins += 1;
      if (segeltorpGoals < opponentGoals) analytics.segeltorpCloseLosses += 1;
      if (segeltorpGoals === opponentGoals) analytics.segeltorpCloseDraws += 1;
    }

    if (segeltorpGoals < opponentGoals && difference >= 4) {
      analytics.segeltorpUnevenLosses += 1;
    }
  });

  return analytics;
}

function renderMatchAnalytics() {
  const data = series[activeSeries];
  const analytics = calculateMatchAnalytics(data);
  document.querySelector("#analytics-series").textContent = data.name;
  document.querySelector("#large-difference-total").textContent =
    analytics.largeDifferenceTotal;
  document.querySelector("#segeltorp-large-total").textContent =
    analytics.segeltorpLargeTotal;
  document.querySelector("#segeltorp-large-wins").textContent =
    analytics.segeltorpLargeWins;
  document.querySelector("#segeltorp-large-losses").textContent =
    analytics.segeltorpLargeLosses;
  document.querySelector("#segeltorp-close-total").textContent =
    analytics.segeltorpCloseTotal;
  document.querySelector("#segeltorp-close-wins").textContent =
    analytics.segeltorpCloseWins;
  document.querySelector("#segeltorp-close-losses").textContent =
    analytics.segeltorpCloseLosses;
  document.querySelector("#segeltorp-close-draws").textContent =
    analytics.segeltorpCloseDraws;
  document.querySelector("#segeltorp-uneven-losses").textContent =
    analytics.segeltorpUnevenLosses;
}

function formatDate(dateString, includeTime = false) {
  const date = new Date(dateString);
  const options = { weekday: "short", day: "numeric", month: "short" };
  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }
  return new Intl.DateTimeFormat("sv-SE", options).format(date);
}

function renderMatches() {
  const data = series[activeSeries];
  const isResults = activeTab === "results";
  const now = new Date();
  const matches = data.games
    .filter((match) => {
      const hasResult = Boolean(getMatchResult(match));
      const hasStarted = new Date(match[4]) < now;
      return isResults ? hasStarted || hasResult : !hasStarted && !hasResult;
    })
    .sort((a, b) => {
      const difference = new Date(a[4]) - new Date(b[4]);
      return isResults ? -difference : difference;
    });

  if (!matches.length) {
    matchesList.innerHTML = `<p class="empty-matches">${
      isResults ? "Det finns inga tidigare matcher i serien." : "Det finns inga kommande matcher i serien."
    }</p>`;
    return;
  }

  matchesList.innerHTML = matches
    .map((match) => {
      const [homeId, awayId] = match;
      const home = teamById(data, homeId);
      const away = teamById(data, awayId);
      const result = getMatchResult(match);
      const homeScore = result ? result.home : "–";
      const awayScore = result ? result.away : "–";
      const status = result ? "Slut" : isResults ? "Resultat saknas" : "Kommande";

      return `
        <article class="match-card">
          <div class="match-meta">
            <span>Omgång ${match[6]} · ${formatDate(match[4], true)}</span>
            <span class="${result ? "" : "missing-result"}">${status}</span>
          </div>
          <div class="match-team">
            ${badge(home)}
            <span>${home.name}</span>
            <strong class="match-score">${homeScore}</strong>
          </div>
          <div class="match-team">
            ${badge(away)}
            <span>${away.name}</span>
            <strong class="match-score">${awayScore}</strong>
          </div>
          <div class="match-status">
            <span>${match[5]} · Match ${match[7]}</span>
            <button class="edit-result-button" type="button" data-match-number="${match[7]}">
              ${result ? "Ändra resultat" : "Lägg till resultat"}
            </button>
          </div>
        </article>`;
    })
    .join("");
}

function findMatch(matchNumber) {
  return series[activeSeries].games.find((match) => match[7] === matchNumber);
}

function openResultDialog(matchNumber) {
  const match = findMatch(matchNumber);
  if (!match) {
    console.error(`Match ${matchNumber} hittades inte i den valda serien.`);
    return;
  }

  const data = series[activeSeries];
  const home = teamById(data, match[0]);
  const away = teamById(data, match[1]);
  const result = getMatchResult(match);
  editingMatchNumber = matchNumber;
  document.querySelector("#home-score-label").textContent = home.name;
  document.querySelector("#away-score-label").textContent = away.name;
  document.querySelector("#home-score").value = result?.home ?? "";
  document.querySelector("#away-score").value = result?.away ?? "";
  document.querySelector("#result-dialog-meta").textContent =
    `${formatDate(match[4], true)} · ${match[5]} · Match ${match[7]}`;
  document.querySelector("#result-error").textContent = "";
  deleteResultButton.hidden = !result;
  resultDialog.showModal();
  document.querySelector("#home-score").focus();
}

async function saveRemoteResult(matchNumber, result) {
  const { error } = await supabaseClient.from("match_results").upsert({
    match_number: matchNumber,
    home_score: result.home,
    away_score: result.away,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Kunde inte spara resultatet i Supabase.", error);
    document.querySelector("#result-error").textContent =
      "Resultatet kunde inte sparas. Kontrollera anslutningen och försök igen.";
    return false;
  }

  savedResults = { ...savedResults, [matchNumber]: result };
  return true;
}

matchesList.addEventListener("click", (event) => {
  const button = event.target.closest(".edit-result-button");
  if (button) openResultDialog(button.dataset.matchNumber);
});

resultForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const homeScore = Number.parseInt(document.querySelector("#home-score").value, 10);
  const awayScore = Number.parseInt(document.querySelector("#away-score").value, 10);

  if (!Number.isInteger(homeScore) || homeScore < 0 || !Number.isInteger(awayScore) || awayScore < 0) {
    document.querySelector("#result-error").textContent =
      "Ange ett heltal på noll eller mer för båda lagen.";
    return;
  }

  const submitButton = resultForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Sparar…";
  const saved = await saveRemoteResult(editingMatchNumber, {
    home: homeScore,
    away: awayScore,
  });
  submitButton.disabled = false;
  submitButton.textContent = "Spara resultat";
  if (!saved) return;

  resultDialog.close();
  renderAll();
});

deleteResultButton.addEventListener("click", async () => {
  deleteResultButton.disabled = true;
  const { error } = await supabaseClient
    .from("match_results")
    .delete()
    .eq("match_number", editingMatchNumber);
  deleteResultButton.disabled = false;

  if (error) {
    console.error("Kunde inte ta bort resultatet från Supabase.", error);
    document.querySelector("#result-error").textContent =
      "Resultatet kunde inte tas bort. Kontrollera anslutningen och försök igen.";
    return;
  }

  delete savedResults[editingMatchNumber];
  resultDialog.close();
  renderAll();
});

document.querySelector("#dialog-close").addEventListener("click", () => resultDialog.close());

function renderAll() {
  renderStandings();
  renderMatchAnalytics();
  renderMatches();
}

Object.entries(series).forEach(([key, data]) => {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = data.name;
  seriesSelect.append(option);
});

seriesSelect.addEventListener("change", (event) => {
  activeSeries = event.target.value;
  renderAll();
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeTab = tab.dataset.tab;
    tabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-selected", selected);
    });
    renderMatches();
  });
});

const menuButton = document.querySelector(".menu-button");
const mainNav = document.querySelector(".main-nav");

menuButton.addEventListener("click", () => {
  const open = mainNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", open);
  menuButton.setAttribute("aria-label", open ? "Stäng meny" : "Öppna meny");
});

mainNav.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
});

supabaseClient.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error("Kunde inte kontrollera Supabase-sessionen.", error);
    loginError.textContent = "Kunde inte kontrollera inloggningen. Ladda om sidan.";
    return;
  }

  if (data.session) openAuthenticatedSite();
});
