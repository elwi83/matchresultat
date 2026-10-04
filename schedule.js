const schedule = window.MATCH_SCHEDULE;
const currentSeries = window.MATCH_SERIES;
const supabaseClient = window.supabase.createClient(
  window.APP_CONFIG.supabaseUrl,
  window.APP_CONFIG.supabasePublishableKey,
);
const loginEmail = "torpet15@elwi83.se";
const loginScreen = document.querySelector("#login-screen");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const siteContent = document.querySelector("#site-content");
const scheduleHead = document.querySelector("#schedule-head");
const scheduleBody = document.querySelector("#schedule-body");
const saveStatus = document.querySelector("#save-status");
let assignments = {};
let dsLevels = {};
let matchResults = {};
let standingsPositions = {};
const p14EligibilityMatchNumber = "p14-eligibility";
const dsMatchNumbers = {
  A: "ds-level-a",
  AB: "ds-level-ab",
  B: "ds-level-b",
};

function assignmentKey(matchNumber, playerName) {
  return `${matchNumber}::${playerName}`;
}

function initialAssignments() {
  const values = {};
  schedule.matches.forEach((match) => {
    schedule.players.forEach((player) => {
      values[assignmentKey(match.matchNumber, player)] = match.assignedPlayers.includes(player)
        ? "assigned"
        : "available";
    });
    schedule.coaches.forEach((coach) => {
      values[assignmentKey(match.matchNumber, coach)] = match.assignedCoaches.includes(coach)
        ? "assigned"
        : "available";
    });
  });
  schedule.players.forEach((player) => {
    const hasP14Assignment = schedule.matches.some(
      (match) => match.category === "P14" && match.assignedPlayers.includes(player),
    );
    values[assignmentKey(p14EligibilityMatchNumber, player)] = hasP14Assignment
      ? "assigned"
      : "available";
  });
  return values;
}

const defaultAssignments = initialAssignments();

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

function formatScheduleDate(match) {
  const options = {
    weekday: "short",
    day: "numeric",
    month: "short",
  };
  if (!match.timeTbd) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }
  const formatted = new Intl.DateTimeFormat("sv-SE", options).format(new Date(match.date));
  return match.timeTbd ? `${formatted} · tid ej fastställd` : formatted;
}

function getWeekDetails(value) {
  const source = new Date(value);
  const date = new Date(Date.UTC(source.getFullYear(), source.getMonth(), source.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return { key: `${date.getUTCFullYear()}-${week}`, label: `Vecka ${week}` };
}

function calculateStandingsPositions() {
  standingsPositions = {};

  Object.values(currentSeries).forEach((series) => {
    const table = series.teams.map((team) => ({
      id: team.id,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    }));
    const teamById = (id) => table.find((team) => team.id === id);

    series.games.forEach((game) => {
      const stored = matchResults[game[7]];
      const result =
        Number.isInteger(game[2]) && Number.isInteger(game[3])
          ? { home: game[2], away: game[3] }
          : stored;
      if (!result) return;

      const home = teamById(game[0]);
      const away = teamById(game[1]);
      home.goalsFor += result.home;
      home.goalsAgainst += result.away;
      away.goalsFor += result.away;
      away.goalsAgainst += result.home;
      if (result.home > result.away) home.points += 3;
      else if (result.home < result.away) away.points += 3;
      else {
        home.points += 1;
        away.points += 1;
      }
    });

    table.sort(
      (a, b) =>
        b.points - a.points ||
        b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
        b.goalsFor - a.goalsFor,
    );
    standingsPositions[series.name] = Object.fromEntries(
      table.map((team, index) => [team.id, index + 1]),
    );
  });
}

function opponentPosition(match) {
  if (match.category === "P14") return null;
  const series = Object.values(currentSeries).find((item) => item.name.endsWith(match.series));
  const game = series?.games.find((item) => item[7] === match.matchNumber);
  if (!series || !game) return null;
  const opponentId = series.teams.find((team) => team.name === match.opponent)?.id;
  return opponentId ? standingsPositions[series.name]?.[opponentId] : null;
}

function formatPosition(position) {
  return `${position}${position <= 2 ? ":a" : ":e"} plats`;
}

function isP14Eligible(player) {
  return assignments[assignmentKey(p14EligibilityMatchNumber, player)] === "assigned";
}

function dsButton(player) {
  const level = dsLevels[player] ?? "";
  return `
    <button
      class="ds-level-button ${level ? `level-${level.toLowerCase()}` : ""}"
      type="button"
      data-player="${player}"
      aria-label="DS för ${player}: ${level || "inte valt"}"
    >${level}</button>`;
}

function effectiveStatus(person, match, role) {
  if (role === "player" && match.category === "P14" && !isP14Eligible(person)) {
    return "unavailable";
  }
  return assignments[assignmentKey(match.matchNumber, person)] ?? "available";
}

function assignmentButton(person, match, role) {
  const automaticallyUnavailable =
    role === "player" && match.category === "P14" && !isP14Eligible(person);
  const status = effectiveStatus(person, match, role);
  const symbol = status === "assigned" ? "X" : status === "unavailable" ? "–" : "";
  const action =
    status === "available"
      ? "Kalla"
      : status === "assigned"
        ? "Markera som ej tillgänglig"
        : "Rensa status för";
  return `
    <button
      class="assignment-button ${status}"
      type="button"
      data-match-number="${match.matchNumber}"
      data-player="${person}"
      aria-label="${automaticallyUnavailable ? `${person} är inte tillgänglig för P14` : `${action} ${person}, ${match.opponent}`}"
      ${automaticallyUnavailable ? "disabled" : ""}
    >${symbol}</button>`;
}

function personRow(person, matches, role) {
  const assignedMatches = matches.filter(
    (match) => effectiveStatus(person, match, role) === "assigned",
  );
  const total = assignedMatches.length;
  const details = [`${total} matcher`];
  if (role === "player") {
    const aMatches = assignedMatches.filter((match) => match.series === "A Södra").length;
    const p14Matches = assignedMatches.filter((match) => match.category === "P14").length;
    if (aMatches) details.push(`${aMatches} A`);
    if (p14Matches) details.push(`${p14Matches} P14`);
  }

  return `
    <tr class="${role}-row">
      <th scope="row">
        ${person}
        <span class="player-total">${details.join(" · ")}</span>
      </th>
      <td class="ds-level-cell">
        ${role === "player" ? dsButton(person) : '<span class="not-applicable">–</span>'}
      </td>
      <td class="p14-eligibility-cell">
        ${
          role === "player"
            ? `<button
                class="p14-eligibility-button ${isP14Eligible(person) ? "eligible" : ""}"
                type="button"
                data-player="${person}"
                aria-pressed="${isP14Eligible(person)}"
                aria-label="${isP14Eligible(person) ? `Ta bort P14 för ${person}` : `Gör ${person} tillgänglig för P14`}"
              >${isP14Eligible(person) ? "Ja" : ""}</button>`
            : '<span class="not-applicable">–</span>'
        }
      </td>
      ${matches
        .map(
          (match) => `
            <td class="category-${match.category.toLowerCase()} ${match.weekStart ? "week-start" : ""}">
              ${assignmentButton(person, match, role)}
            </td>`,
        )
        .join("")}
    </tr>`;
}

function renderSchedule() {
  const matches = schedule.matches.map((match, index) => {
    const week = getWeekDetails(match.date);
    const previousWeek = index ? getWeekDetails(schedule.matches[index - 1].date).key : null;
    return { ...match, week, weekStart: week.key !== previousWeek };
  });
  document.querySelector("#schedule-match-count").textContent = matches.length;

  scheduleHead.innerHTML = `
    <tr>
      <th scope="col">Spelare</th>
      <th scope="col" class="ds-level-header">DS</th>
      <th scope="col" class="p14-eligibility-header">P14</th>
      ${matches
        .map(
          (match) => `
            <th
              scope="col"
              class="category-${match.category.toLowerCase()} ${match.weekStart ? "week-start" : ""}"
            >
              <div class="match-column" title="${match.home} – ${match.away}">
                <span class="week-label">${match.week.label}</span>
                <span class="series-label">${match.series}</span>
                <strong>${match.opponent}</strong>
                ${
                  opponentPosition(match)
                    ? `<span class="opponent-position">${formatPosition(opponentPosition(match))}</span>`
                    : ""
                }
                <span>${formatScheduleDate(match)}</span>
                <span>${match.venue}</span>
              </div>
            </th>`,
        )
        .join("")}
    </tr>`;

  const playerRows = schedule.players
    .map((player) => personRow(player, matches, "player"))
    .join("");
  const countRow = `
    <tr class="player-count-row">
      <th scope="row">Antal spelare</th>
      <td class="ds-level-cell">
        <strong>${schedule.players.filter((player) => dsLevels[player]).length}</strong>
        <span class="eligible-total-label">klassade</span>
      </td>
      <td class="p14-eligibility-cell">
        <strong>${schedule.players.filter(isP14Eligible).length}</strong>
        <span class="eligible-total-label">Ja</span>
      </td>
      ${matches
        .map((match) => {
          const count = schedule.players.filter(
            (player) => effectiveStatus(player, match, "player") === "assigned",
          ).length;
          return `<td class="category-${match.category.toLowerCase()} ${match.weekStart ? "week-start" : ""}"><strong>${count}</strong></td>`;
        })
        .join("")}
    </tr>`;
  const distributionRow = `
    <tr class="distribution-row">
      <th scope="row">Fördelning A / AB / B</th>
      <td class="ds-level-cell"></td>
      <td class="p14-eligibility-cell"></td>
      ${matches
        .map((match) => {
          const counts = { A: 0, AB: 0, B: 0 };
          schedule.players.forEach((player) => {
            if (effectiveStatus(player, match, "player") === "assigned" && dsLevels[player]) {
              counts[dsLevels[player]] += 1;
            }
          });
          const total = counts.A + counts.AB + counts.B;
          const segments = ["A", "AB", "B"]
            .filter((level) => counts[level])
            .map(
              (level) =>
                `<i class="distribution-${level.toLowerCase()}" style="width:${(counts[level] / total) * 100}%"></i>`,
            )
            .join("");
          return `
            <td class="category-${match.category.toLowerCase()} ${match.weekStart ? "week-start" : ""}">
              <div class="distribution-bar ${total ? "" : "empty"}">${segments}</div>
              <span class="distribution-label">${
                total ? `A ${counts.A} · AB ${counts.AB} · B ${counts.B}` : "Ej klassat"
              }</span>
            </td>`;
        })
        .join("")}
    </tr>`;
  const coachHeading = `
    <tr class="coach-heading-row">
      <th scope="row">Tränare</th>
      <td class="ds-level-cell"></td>
      <td class="p14-eligibility-cell"></td>
      ${matches
        .map(
          (match) =>
            `<td class="category-${match.category.toLowerCase()} ${match.weekStart ? "week-start" : ""}"></td>`,
        )
        .join("")}
    </tr>`;
  const coachRows = schedule.coaches
    .map((coach) => personRow(coach, matches, "coach"))
    .join("");
  scheduleBody.innerHTML = playerRows + countRow + distributionRow + coachHeading + coachRows;
}

async function loadAssignments() {
  assignments = { ...defaultAssignments };
  dsLevels = {};
  matchResults = {};
  const [assignmentResponse, resultResponse] = await Promise.all([
    supabaseClient
      .from("match_assignments")
      .select("match_number, player_name, status, updated_at"),
    supabaseClient.from("match_results").select("match_number, home_score, away_score"),
  ]);

  if (assignmentResponse.error) {
    console.error("Kunde inte hämta matchschemat.", assignmentResponse.error);
    loginError.textContent = "Kunde inte hämta matchschemat. Försök igen.";
    return false;
  }
  if (resultResponse.error) {
    console.error("Kunde inte hämta serieresultaten.", resultResponse.error);
    loginError.textContent = "Kunde inte hämta serieresultaten. Försök igen.";
    return false;
  }

  const dsRows = {};
  assignmentResponse.data.forEach((item) => {
    const level = Object.entries(dsMatchNumbers).find(
      ([, matchNumber]) => matchNumber === item.match_number,
    )?.[0];
    if (level) {
      const existing = dsRows[item.player_name];
      if (!existing || new Date(item.updated_at) > new Date(existing.updated_at)) {
        dsRows[item.player_name] = { level, updated_at: item.updated_at };
      }
      return;
    }
    assignments[assignmentKey(item.match_number, item.player_name)] = item.status;
  });
  Object.entries(dsRows).forEach(([player, value]) => {
    dsLevels[player] = value.level;
  });
  matchResults = Object.fromEntries(
    resultResponse.data.map((result) => [
      result.match_number,
      { home: result.home_score, away: result.away_score },
    ]),
  );
  calculateStandingsPositions();
  return true;
}

async function openAuthenticatedSite() {
  if (!(await loadAssignments())) {
    await supabaseClient.auth.signOut();
    return;
  }

  renderSchedule();
  showSite();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const username = formData.get("username");
  const password = formData.get("password");
  const submitButton = loginForm.querySelector('button[type="submit"]');

  if (username !== "Torpet15") {
    loginError.textContent = "Fel användarnamn eller lösenord.";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Loggar in…";
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: loginEmail,
    password,
  });
  submitButton.disabled = false;
  submitButton.textContent = "Logga in";

  if (error) {
    console.error("Supabase-inloggningen misslyckades.", error);
    loginError.textContent = "Fel användarnamn eller lösenord.";
    return;
  }

  await openAuthenticatedSite();
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error("Utloggningen misslyckades.", error);
    window.alert("Det gick inte att logga ut. Försök igen.");
    return;
  }
  showLogin();
});

scheduleBody.addEventListener("click", async (event) => {
  const dsLevelButton = event.target.closest(".ds-level-button");
  if (dsLevelButton) {
    const playerName = dsLevelButton.dataset.player;
    const levels = ["", "A", "AB", "B"];
    const currentIndex = levels.indexOf(dsLevels[playerName] ?? "");
    const nextLevel = levels[(currentIndex + 1) % levels.length];
    await persistDsLevel(dsLevelButton, playerName, nextLevel);
    return;
  }

  const eligibilityButton = event.target.closest(".p14-eligibility-button");
  if (eligibilityButton) {
    const playerName = eligibilityButton.dataset.player;
    const key = assignmentKey(p14EligibilityMatchNumber, playerName);
    const nextStatus = assignments[key] === "assigned" ? "available" : "assigned";
    await persistAssignmentStatus(
      eligibilityButton,
      p14EligibilityMatchNumber,
      playerName,
      nextStatus,
    );
    return;
  }

  const button = event.target.closest(".assignment-button");
  if (!button) return;

  const matchNumber = button.dataset.matchNumber;
  const playerName = button.dataset.player;
  const key = assignmentKey(matchNumber, playerName);
  const currentStatus = assignments[key] ?? "available";
  const nextStatus =
    currentStatus === "available"
      ? "assigned"
      : currentStatus === "assigned"
        ? "unavailable"
        : "available";
  await persistAssignmentStatus(button, matchNumber, playerName, nextStatus);
});

async function persistDsLevel(button, playerName, nextLevel) {
  button.classList.add("saving");
  saveStatus.classList.remove("error");
  saveStatus.textContent = "Sparar DS-nivå…";

  if (nextLevel) {
    const { error: upsertError } = await supabaseClient.from("match_assignments").upsert({
      match_number: dsMatchNumbers[nextLevel],
      player_name: playerName,
      assigned: true,
      status: "assigned",
      updated_at: new Date().toISOString(),
    });
    if (upsertError) {
      console.error("Kunde inte spara DS-nivån.", upsertError);
      button.classList.remove("saving");
      saveStatus.classList.add("error");
      saveStatus.textContent = "DS-nivån kunde inte sparas. Försök igen.";
      return;
    }
  }

  const matchNumbersToDelete = Object.entries(dsMatchNumbers)
    .filter(([level]) => level !== nextLevel)
    .map(([, matchNumber]) => matchNumber);
  const { error: deleteError } = await supabaseClient
    .from("match_assignments")
    .delete()
    .in("match_number", matchNumbersToDelete)
    .eq("player_name", playerName);

  if (deleteError) {
    console.error("Kunde inte rensa tidigare DS-nivå.", deleteError);
    button.classList.remove("saving");
    saveStatus.classList.add("error");
    saveStatus.textContent = "Tidigare DS-nivå kunde inte rensas. Försök igen.";
    return;
  }

  dsLevels[playerName] = nextLevel;
  renderSchedule();
  saveStatus.textContent = "DS-nivån är sparad.";
  window.setTimeout(() => {
    if (saveStatus.textContent === "DS-nivån är sparad.") saveStatus.textContent = "";
  }, 2500);
}

async function persistAssignmentStatus(button, matchNumber, playerName, nextStatus) {
  const key = assignmentKey(matchNumber, playerName);
  button.classList.add("saving");
  saveStatus.classList.remove("error");
  saveStatus.textContent = "Sparar ändring…";
  const request =
    nextStatus === defaultAssignments[key]
      ? supabaseClient
          .from("match_assignments")
          .delete()
          .eq("match_number", matchNumber)
          .eq("player_name", playerName)
      : supabaseClient.from("match_assignments").upsert({
          match_number: matchNumber,
          player_name: playerName,
          assigned: nextStatus === "assigned",
          status: nextStatus,
          updated_at: new Date().toISOString(),
        });
  const { error } = await request;

  if (error) {
    console.error("Kunde inte spara spelartilldelningen.", error);
    button.classList.remove("saving");
    saveStatus.classList.add("error");
    saveStatus.textContent = "Ändringen kunde inte sparas. Försök igen.";
    return;
  }

  assignments[key] = nextStatus;
  renderSchedule();
  saveStatus.textContent = "Ändringen är sparad.";
  window.setTimeout(() => {
    if (saveStatus.textContent === "Ändringen är sparad.") saveStatus.textContent = "";
  }, 2500);
}

const menuButton = document.querySelector(".menu-button");
const mainNav = document.querySelector(".main-nav");
menuButton.addEventListener("click", () => {
  const open = mainNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", open);
  menuButton.setAttribute("aria-label", open ? "Stäng meny" : "Öppna meny");
});

supabaseClient.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error("Kunde inte kontrollera Supabase-sessionen.", error);
    loginError.textContent = "Kunde inte kontrollera inloggningen. Ladda om sidan.";
    return;
  }
  if (data.session) openAuthenticatedSite();
});
