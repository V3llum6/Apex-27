import { LeagueFixture, LeagueStanding, SeasonTopScorer, SeasonCampaign, TeamProfile, PlayerCard, SeasonRewardsSummary, UserProfile } from '../types';
import { TOP_TEAMS } from '../data/teamsDatabase';

const STORAGE_KEY_38_SEASON = 'apex_season_campaign_38';

export interface UserMatchSummary {
  matchday: number;
  opponent: TeamProfile;
  isHome: boolean;
  userScore: number;
  cpuScore: number;
  result: 'W' | 'D' | 'L';
  userScorers: string[];
  cpuScorers: string[];
}

/**
 * Generate standard 38-matchday round-robin schedule for 20 clubs
 * (1 User club + 19 TOP_TEAMS opponents = 20 teams)
 * 19 opponents * 2 (Home & Away) = 38 matchdays.
 * Each matchday has 10 matches (1 user match + 9 computer matches).
 * Total fixtures = 380 matches.
 */
export function generate38SeasonFixtures(
  userTeamId: string,
  userTeamName: string,
  userOvr: number
): { fixtures: LeagueFixture[]; standings: LeagueStanding[] } {
  // 20 teams: User team + 19 opponents from TOP_TEAMS
  const userTeam = {
    id: userTeamId,
    name: userTeamName,
    shortName: userTeamName.slice(0, 3).toUpperCase(),
    badge: '🦁',
    rating: userOvr,
    isUser: true,
  };

  const opponentTeams = TOP_TEAMS.map(t => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    badge: t.badge,
    rating: t.rating,
    isUser: false,
    keyPlayers: t.keyPlayers,
  }));

  const allTeams = [userTeam, ...opponentTeams];
  const numTeams = allTeams.length; // 20

  // Initial standings for all 20 clubs
  const standings: LeagueStanding[] = allTeams.map(t => ({
    teamId: t.id,
    teamName: t.name,
    shortName: t.shortName,
    badge: t.badge,
    isUser: t.isUser,
    rating: t.rating,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
  }));

  // Round-robin scheduling using polygon rotation algorithm
  // N = 20, 19 rounds for first half
  const roundsFirstHalf: { home: typeof allTeams[0]; away: typeof allTeams[0] }[][] = [];
  const rotationTeams = allTeams.slice(1); // 19 teams

  for (let round = 0; round < numTeams - 1; round++) {
    const roundMatches: { home: typeof allTeams[0]; away: typeof allTeams[0] }[] = [];

    // Pair fixed team (index 0) with one rotating team
    const rotatingIndex = round % (numTeams - 1);
    const opponentOfFixed = rotationTeams[rotatingIndex];

    if (round % 2 === 0) {
      roundMatches.push({ home: allTeams[0], away: opponentOfFixed });
    } else {
      roundMatches.push({ home: opponentOfFixed, away: allTeams[0] });
    }

    // Pair the other 18 rotating teams
    for (let i = 1; i < numTeams / 2; i++) {
      const teamAIdx = (round + i) % (numTeams - 1);
      const teamBIdx = (round + numTeams - 1 - i) % (numTeams - 1);
      const teamA = rotationTeams[teamAIdx];
      const teamB = rotationTeams[teamBIdx];

      if (i % 2 === 0) {
        roundMatches.push({ home: teamA, away: teamB });
      } else {
        roundMatches.push({ home: teamB, away: teamA });
      }
    }

    roundsFirstHalf.push(roundMatches);
  }

  // Second half (matchdays 20-38): Mirror first half with swapped venues
  const allFixtures: LeagueFixture[] = [];

  // Matchdays 1 to 19
  for (let m = 0; m < 19; m++) {
    const matchday = m + 1;
    const matches = roundsFirstHalf[m];
    matches.forEach((match, idx) => {
      const isUserMatch = match.home.isUser || match.away.isUser;
      allFixtures.push({
        id: `fix_s1_md${matchday}_m${idx + 1}`,
        matchday,
        homeTeamId: match.home.id,
        homeTeamName: match.home.name,
        homeTeamShortName: match.home.shortName,
        homeTeamBadge: match.home.badge,
        homeTeamRating: match.home.rating,
        awayTeamId: match.away.id,
        awayTeamName: match.away.name,
        awayTeamShortName: match.away.shortName,
        awayTeamBadge: match.away.badge,
        awayTeamRating: match.away.rating,
        isUserMatch,
        isPlayed: false,
      });
    });
  }

  // Matchdays 20 to 38
  for (let m = 0; m < 19; m++) {
    const matchday = m + 20;
    const matches = roundsFirstHalf[m];
    matches.forEach((match, idx) => {
      // Swapped venue: home becomes away, away becomes home
      const home = match.away;
      const away = match.home;
      const isUserMatch = home.isUser || away.isUser;

      allFixtures.push({
        id: `fix_s1_md${matchday}_m${idx + 1}`,
        matchday,
        homeTeamId: home.id,
        homeTeamName: home.name,
        homeTeamShortName: home.shortName,
        homeTeamBadge: home.badge,
        homeTeamRating: home.rating,
        awayTeamId: away.id,
        awayTeamName: away.name,
        awayTeamShortName: away.shortName,
        awayTeamBadge: away.badge,
        awayTeamRating: away.rating,
        isUserMatch,
        isPlayed: false,
      });
    });
  }

  return { fixtures: allFixtures, standings };
}

/**
 * Initialize or create a fresh 38-match season
 */
export function createNewSeasonCampaign(
  seasonNumber: number = 1,
  userSquadName: string = 'Apex FC',
  userOvr: number = 88
): SeasonCampaign {
  const { fixtures, standings } = generate38SeasonFixtures('user_squad', userSquadName, userOvr);

  // Initial popular star scorers to seed realistic competition
  const initialTopScorers: SeasonTopScorer[] = [
    { playerName: 'Erling Haaland', teamName: 'Manchester City', teamBadge: '🦁', goals: 0 },
    { playerName: 'Kylian Mbappé', teamName: 'Real Madrid', teamBadge: '👑', goals: 0 },
    { playerName: 'Harry Kane', teamName: 'Bayern Munich', teamBadge: '⭐', goals: 0 },
    { playerName: 'Mohamed Salah', teamName: 'Liverpool', teamBadge: '🦅', goals: 0 },
    { playerName: 'Robert Lewandowski', teamName: 'FC Barcelona', teamBadge: '🔵🔴', goals: 0 },
  ];

  return {
    seasonNumber,
    leagueName: 'Apex Premier Championship (38 Matches)',
    currentMatchday: 1,
    totalMatchdays: 38,
    fixtures,
    standings,
    topScorers: initialTopScorers,
    isCompleted: false,
    lastUpdated: Date.now(),
  };
}

/**
 * Load season from storage or create fresh
 */
export function loadSeasonCampaign(
  userSquadName: string = 'Apex FC',
  userOvr: number = 88
): SeasonCampaign {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY_38_SEASON);
      if (saved) {
        const parsed: SeasonCampaign = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.fixtures) && parsed.fixtures.length === 380) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load season campaign from storage', e);
  }

  const fresh = createNewSeasonCampaign(1, userSquadName, userOvr);
  saveSeasonCampaign(fresh);
  return fresh;
}

/**
 * Save season campaign to storage
 */
export function saveSeasonCampaign(campaign: SeasonCampaign): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_38_SEASON, JSON.stringify(campaign));
    }
  } catch (e) {
    console.error('Failed to save season campaign to storage', e);
  }
}

/**
 * Positional weight calculation for randomising goalscorers across the team
 */
export function generateSquadGoalscorers(
  squadCards: (PlayerCard | undefined | null)[],
  goalCount: number,
  fallbackName: string = 'Apex Striker'
): string[] {
  if (goalCount <= 0) return [];

  // Filter to valid outfield cards
  const outfield = squadCards.filter((c): c is PlayerCard => Boolean(c && c.position !== 'GK'));

  if (outfield.length === 0) {
    return Array(goalCount).fill(fallbackName);
  }

  // Calculate weighted probabilities based on position & rating
  const weighted = outfield.map(card => {
    let baseWeight = 20;
    const pos = (card.position || '').toUpperCase();
    if (['ST', 'CF'].includes(pos)) baseWeight = 55;
    else if (['LW', 'RW', 'LF', 'RF'].includes(pos)) baseWeight = 45;
    else if (['CAM'].includes(pos)) baseWeight = 32;
    else if (['CM', 'RM', 'LM'].includes(pos)) baseWeight = 22;
    else if (['CDM'].includes(pos)) baseWeight = 12;
    else if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) baseWeight = 7;

    const ratingMultiplier = (card.rating || 85) / 85;
    return {
      name: card.shortName || card.name,
      weight: Math.max(1, baseWeight * ratingMultiplier),
    };
  });

  const totalWeight = weighted.reduce((acc, cur) => acc + cur.weight, 0);
  const scorers: string[] = [];

  for (let i = 0; i < goalCount; i++) {
    let roll = Math.random() * totalWeight;
    let chosen = weighted[0].name;

    for (const item of weighted) {
      if (roll < item.weight) {
        chosen = item.name;
        break;
      }
      roll -= item.weight;
    }
    scorers.push(chosen);
  }

  return scorers;
}

/**
 * Generate realistic CPU goalscorers from key players roster
 */
export function generateCpuGoalscorers(
  keyPlayers: string[],
  goalCount: number,
  fallbackName: string = 'Opponent Star'
): string[] {
  if (goalCount <= 0) return [];
  const players = keyPlayers && keyPlayers.length > 0 ? keyPlayers : [fallbackName];
  const positionalWeights = [50, 30, 15, 5];

  const weighted = players.map((name, idx) => ({
    name,
    weight: positionalWeights[idx] || 10,
  }));

  const totalWeight = weighted.reduce((acc, cur) => acc + cur.weight, 0);
  const scorers: string[] = [];

  for (let i = 0; i < goalCount; i++) {
    let roll = Math.random() * totalWeight;
    let chosen = weighted[0].name;

    for (const item of weighted) {
      if (roll < item.weight) {
        chosen = item.name;
        break;
      }
      roll -= item.weight;
    }
    scorers.push(chosen);
  }

  return scorers;
}

/**
 * Format goalscorers list into compact display text like "Messi (2G), Suarez (1G)"
 */
export function formatScorersSummary(scorers: string[]): string {
  if (!scorers || scorers.length === 0) return '';
  const counts: Record<string, number> = {};
  scorers.forEach(s => {
    counts[s] = (counts[s] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => (count > 1 ? `${name} (${count}G)` : `${name} (1G)`))
    .join(', ');
}

/**
 * Realistic match simulation between two teams
 */
export function simulateMatch(
  homeRating: number,
  awayRating: number,
  homeKeyPlayers: string[] = ['Striker', 'Winger', 'Midfielder'],
  awayKeyPlayers: string[] = ['Striker', 'Winger', 'Midfielder']
): {
  homeScore: number;
  awayScore: number;
  scorers: string[];
  homeScorers: string[];
  awayScorers: string[];
} {
  // Home advantage (+2 to effective rating)
  const homeAdvantage = 2.0;
  const ratingDiff = (homeRating + homeAdvantage) - awayRating;

  // Expected goals based on rating gap
  const baseHomeExpected = Math.max(0.6, 1.6 + (ratingDiff * 0.12));
  const baseAwayExpected = Math.max(0.4, 1.2 - (ratingDiff * 0.10));

  // Generate score using pseudo-poisson distribution
  const generateGoals = (exp: number) => {
    const rand = Math.random();
    if (rand < Math.exp(-exp)) return 0;
    if (rand < Math.exp(-exp) * (1 + exp)) return 1;
    if (rand < Math.exp(-exp) * (1 + exp + (exp * exp) / 2)) return 2;
    if (rand < 0.93) return 3;
    if (rand < 0.98) return 4;
    return 5;
  };

  const homeScore = generateGoals(baseHomeExpected);
  const awayScore = generateGoals(baseAwayExpected);

  const homeScorers = generateCpuGoalscorers(homeKeyPlayers, homeScore, 'Home Player');
  const awayScorers = generateCpuGoalscorers(awayKeyPlayers, awayScore, 'Away Player');
  const scorers = [...homeScorers, ...awayScorers];

  return { homeScore, awayScore, scorers, homeScorers, awayScorers };
}

/**
 * Recalculate standings based on all played fixtures
 */
export function recalculateStandings(
  standings: LeagueStanding[],
  fixtures: LeagueFixture[]
): LeagueStanding[] {
  // Reset records
  const map = new Map<string, LeagueStanding>();
  standings.forEach(s => {
    map.set(s.teamId, {
      ...s,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    });
  });

  // Track match results in order of matchday
  const playedFixtures = fixtures.filter(f => f.isPlayed).sort((a, b) => a.matchday - b.matchday);

  playedFixtures.forEach(f => {
    const home = map.get(f.homeTeamId);
    const away = map.get(f.awayTeamId);

    if (!home || !away || f.homeScore === undefined || f.awayScore === undefined) return;

    home.played += 1;
    away.played += 1;

    home.goalsFor += f.homeScore;
    home.goalsAgainst += f.awayScore;
    away.goalsFor += f.awayScore;
    away.goalsAgainst += f.homeScore;

    if (f.homeScore > f.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
      home.form.push('W');
      away.form.push('L');
    } else if (f.homeScore < f.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
      home.form.push('L');
      away.form.push('W');
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
      home.form.push('D');
      away.form.push('D');
    }

    // Keep last 5 for form
    if (home.form.length > 5) home.form = home.form.slice(-5);
    if (away.form.length > 5) away.form = away.form.slice(-5);

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  });

  // Sort standings: Points desc, GD desc, GF desc, Rating desc
  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return b.rating - a.rating;
  });
}

/**
 * Update top scorers list from all played fixtures (supporting multiple goalscorers per match)
 */
export function recalculateTopScorers(
  fixtures: LeagueFixture[],
  existingScorers: SeasonTopScorer[] = []
): SeasonTopScorer[] {
  const goalCounts = new Map<string, SeasonTopScorer>();

  // Seed with existing list
  existingScorers.forEach(s => {
    goalCounts.set(s.playerName, { ...s, goals: 0 });
  });

  const teamsMap = new Map(TOP_TEAMS.map(t => [t.id, t]));

  // Tally goals from all played fixtures
  fixtures.filter(f => f.isPlayed).forEach(f => {
    if (f.scorersList && f.scorersList.length > 0) {
      // Direct array of player names who scored
      f.scorersList.forEach(playerName => {
        if (!playerName) return;
        const isUserMatch = f.isUserMatch;
        // Determine if this was user player
        const isUser = isUserMatch && !f.awayTeamName.toLowerCase().includes(playerName.toLowerCase()) && !f.homeTeamName.toLowerCase().includes(playerName.toLowerCase());
        const oppTeam = isUserMatch ? (f.homeTeamId === 'user_squad' ? teamsMap.get(f.awayTeamId) : teamsMap.get(f.homeTeamId)) : undefined;
        const isOppKey = oppTeam?.keyPlayers.some(kp => kp.toLowerCase() === playerName.toLowerCase());
        const isUserPlayer = isUserMatch ? !isOppKey : false;

        const teamName = isUserPlayer ? 'Apex FC' : (f.homeTeamName || 'Apex Premier');
        const teamBadge = isUserPlayer ? '🦁' : (f.homeTeamBadge || '⚽');

        const curr = goalCounts.get(playerName) || {
          playerName,
          teamName,
          teamBadge,
          goals: 0,
          isUserPlayer,
        };
        curr.goals += 1;
        goalCounts.set(playerName, curr);
      });
    } else if (f.topScorer) {
      // Parse comma-separated summary: "Messi (2G), Modric (1G)"
      const parts = f.topScorer.split(',').map(p => p.trim()).filter(Boolean);
      parts.forEach(part => {
        const match = part.match(/^(.+?)\s*\((\d+)G\)$/);
        const name = match ? match[1].trim() : part;
        const goals = match ? parseInt(match[2], 10) : 1;

        const teamName = f.isUserMatch ? 'Apex FC' : f.homeTeamName;
        const teamBadge = f.isUserMatch ? '🦁' : f.homeTeamBadge;

        const curr = goalCounts.get(name) || {
          playerName: name,
          teamName,
          teamBadge,
          goals: 0,
          isUserPlayer: f.isUserMatch,
        };

        curr.goals += goals;
        goalCounts.set(name, curr);
      });
    }
  });

  return Array.from(goalCounts.values())
    .filter(s => s.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 20);
}

/**
 * Calculate the full end-of-season rewards payout and bonuses.
 * Includes:
 * - Final League Placement Prize (Coins & Mascherano Rank Tokens)
 * - 👟 Season Golden Boot Winner Bonus: Exactly +1,000,000 Coins extra if a user squad player is top scorer!
 */
export function calculateSeasonRewards(campaign: SeasonCampaign): SeasonRewardsSummary {
  const standings = campaign.standings || [];
  const userStanding = standings.find(s => s.isUser);
  const userRank = userStanding ? standings.findIndex(s => s.isUser) + 1 : (campaign.userFinalRank || 1);

  let rankTitle = `League Rank #${userRank}`;
  let rankCoins = 250000;
  let rankTokens = 0;
  let trophyAwarded = campaign.trophyAwarded || 'Season 38 Finisher Plaque 🎖️';

  if (userRank === 1) {
    rankTitle = 'Apex Premier League Champion 🏆';
    rankCoins = 5000000;
    rankTokens = 3;
    trophyAwarded = 'Apex Premier League Champion 🏆';
  } else if (userRank <= 4) {
    rankTitle = 'Champions League Berth (Top 4) 🛡️';
    rankCoins = 2500000;
    rankTokens = 2;
    trophyAwarded = 'Champions League Qualification Shield 🛡️';
  } else if (userRank === 5) {
    rankTitle = 'Europa League Cup (5th Place) 🌟';
    rankCoins = 1500000;
    rankTokens = 1;
    trophyAwarded = 'Europa League Continental Cup 🌟';
  } else if (userRank <= 10) {
    rankTitle = 'Top Half Finish';
    rankCoins = 750000;
    rankTokens = 0;
    trophyAwarded = 'Top 10 Certificate 🎖️';
  } else if (userRank <= 17) {
    rankTitle = 'Mid-Table Safety';
    rankCoins = 350000;
    rankTokens = 0;
    trophyAwarded = 'Safety Certificate 📜';
  } else {
    rankTitle = 'Relegation Zone';
    rankCoins = 150000;
    rankTokens = 0;
    trophyAwarded = 'Consolation Badge 🥉';
  }

  // Golden Boot Winner logic:
  // Is any user squad player the top scorer (rank 1 or tied with rank 1)?
  const topScorers = campaign.topScorers || [];
  const leader = topScorers[0];
  let goldenBootWon = false;
  let goldenBootScorerName: string | undefined;
  let goldenBootGoals: number | undefined;

  if (leader && leader.goals > 0) {
    // Check if leader itself is a user player, OR if any user player has equal top goals
    const userScorerAtTop = topScorers.find(s => s.isUserPlayer && s.goals === leader.goals);
    if (userScorerAtTop) {
      goldenBootWon = true;
      goldenBootScorerName = userScorerAtTop.playerName;
      goldenBootGoals = userScorerAtTop.goals;
    }
  }

  // Golden Boot Winner gets exactly 1,000,000 bonus coins!
  const goldenBootBonus = goldenBootWon ? 1000000 : 0;
  const totalCoins = rankCoins + goldenBootBonus;
  const totalTokens = rankTokens;

  return {
    userRank,
    rankTitle,
    rankCoins,
    rankTokens,
    goldenBootWon,
    goldenBootScorerName,
    goldenBootGoals,
    goldenBootBonus,
    totalCoins,
    totalTokens,
    trophyAwarded,
  };
}

/**
 * Claim and credit all end-of-season rewards and bonuses to the user profile
 */
export function claimSeasonEndRewards(
  campaign: SeasonCampaign,
  profile: UserProfile
): { updatedCampaign: SeasonCampaign; updatedProfile: UserProfile; summary: SeasonRewardsSummary; alreadyClaimed: boolean } {
  const summary = campaign.rewardsSummary || calculateSeasonRewards(campaign);

  if (campaign.rewardsClaimed) {
    return {
      updatedCampaign: campaign,
      updatedProfile: profile,
      summary,
      alreadyClaimed: true,
    };
  }

  const updatedProfile: UserProfile = {
    ...profile,
    coins: profile.coins + summary.totalCoins,
    rankTokens: profile.rankTokens + summary.totalTokens,
    stats: {
      ...profile.stats,
      trophies: profile.stats.trophies + (summary.userRank === 1 ? 1 : 0) + (summary.goldenBootWon ? 1 : 0),
    },
  };

  const updatedCampaign: SeasonCampaign = {
    ...campaign,
    rewardsClaimed: true,
    rewardsSummary: {
      ...summary,
      claimedAt: Date.now(),
    },
    lastUpdated: Date.now(),
  };

  saveSeasonCampaign(updatedCampaign);

  return {
    updatedCampaign,
    updatedProfile,
    summary,
    alreadyClaimed: false,
  };
}

/**
 * Play or record a user matchday result in the 38-match season
 * Supports randomised goalscorers across the team!
 */
export function playUserMatchInSeason(
  campaign: SeasonCampaign,
  userScore: number,
  cpuScore: number,
  userScorersInput: string[] | string = 'Squad Striker'
): { campaign: SeasonCampaign; userMatch: LeagueFixture; matchdaySummary: LeagueFixture[] } {
  const currentMatchday = campaign.currentMatchday;
  const matchdayFixtures = campaign.fixtures.filter(f => f.matchday === currentMatchday);
  const userFixture = matchdayFixtures.find(f => f.isUserMatch);

  if (!userFixture) {
    throw new Error(`No user fixture found for matchday ${currentMatchday}`);
  }

  const teamsMap = new Map(TOP_TEAMS.map(t => [t.id, t]));
  const isUserHome = userFixture.homeTeamId === 'user_squad';
  const oppTeamId = isUserHome ? userFixture.awayTeamId : userFixture.homeTeamId;
  const oppTeam = teamsMap.get(oppTeamId);

  // Normalize user goalscorers
  let userScorers: string[] = [];
  if (Array.isArray(userScorersInput)) {
    userScorers = [...userScorersInput];
  } else if (typeof userScorersInput === 'string' && userScore > 0) {
    userScorers = Array(userScore).fill(userScorersInput);
  }

  // Generate CPU goalscorers if cpu scored
  const cpuScorers = generateCpuGoalscorers(oppTeam?.keyPlayers || ['Opponent Striker'], cpuScore, oppTeam?.shortName || 'Rival Star');

  // Update user fixture
  userFixture.homeScore = isUserHome ? userScore : cpuScore;
  userFixture.awayScore = isUserHome ? cpuScore : userScore;
  userFixture.isPlayed = true;
  userFixture.playedAt = Date.now();
  userFixture.result = userScore > cpuScore ? 'W' : userScore === cpuScore ? 'D' : 'L';

  // Store combined scorers list and display summary
  const allUserMatchScorers = isUserHome ? [...userScorers, ...cpuScorers] : [...cpuScorers, ...userScorers];
  userFixture.scorersList = allUserMatchScorers;

  const userSummary = formatScorersSummary(userScorers);
  const cpuSummary = formatScorersSummary(cpuScorers);

  if (userScore > 0 && cpuScore > 0) {
    userFixture.topScorer = isUserHome ? `${userSummary}; ${cpuSummary}` : `${cpuSummary}; ${userSummary}`;
  } else if (userScore > 0) {
    userFixture.topScorer = userSummary;
  } else if (cpuScore > 0) {
    userFixture.topScorer = cpuSummary;
  } else {
    userFixture.topScorer = undefined;
  }

  // Simulate other 9 fixtures of this matchday
  matchdayFixtures.forEach(fix => {
    if (fix.isUserMatch || fix.isPlayed) return;

    const homeTeam = teamsMap.get(fix.homeTeamId);
    const awayTeam = teamsMap.get(fix.awayTeamId);

    const homeKeys = homeTeam ? homeTeam.keyPlayers : ['Striker'];
    const awayKeys = awayTeam ? awayTeam.keyPlayers : ['Striker'];

    const sim = simulateMatch(fix.homeTeamRating, fix.awayTeamRating, homeKeys, awayKeys);
    fix.homeScore = sim.homeScore;
    fix.awayScore = sim.awayScore;
    fix.isPlayed = true;
    fix.playedAt = Date.now();
    fix.scorersList = sim.scorers;

    const hSummary = formatScorersSummary(sim.homeScorers);
    const aSummary = formatScorersSummary(sim.awayScorers);
    if (sim.homeScore > 0 && sim.awayScore > 0) {
      fix.topScorer = `${hSummary}; ${aSummary}`;
    } else if (sim.homeScore > 0) {
      fix.topScorer = hSummary;
    } else if (sim.awayScore > 0) {
      fix.topScorer = aSummary;
    } else {
      fix.topScorer = undefined;
    }
  });

  // Recompute standings
  const newStandings = recalculateStandings(campaign.standings, campaign.fixtures);
  const newTopScorers = recalculateTopScorers(campaign.fixtures, campaign.topScorers);

  // Check if season is completed (matchday 38 finished)
  const isCompleted = currentMatchday >= 38;
  const nextMatchday = isCompleted ? 38 : currentMatchday + 1;

  let trophyAwarded: string | undefined = campaign.trophyAwarded;
  let userFinalRank: number | undefined = campaign.userFinalRank;

  if (isCompleted) {
    const userPos = newStandings.findIndex(s => s.isUser) + 1;
    userFinalRank = userPos;
    if (userPos === 1) {
      trophyAwarded = 'Apex Premier League Champion 🏆';
    } else if (userPos <= 4) {
      trophyAwarded = 'Champions League Qualification Shield 🛡️';
    } else if (userPos <= 6) {
      trophyAwarded = 'Europa League Continental Cup 🌟';
    }
  }

  const tempCampaign: SeasonCampaign = {
    ...campaign,
    currentMatchday: nextMatchday,
    standings: newStandings,
    topScorers: newTopScorers,
    isCompleted,
    trophyAwarded,
    userFinalRank,
    lastUpdated: Date.now(),
  };

  let rewardsSummary: SeasonRewardsSummary | undefined = campaign.rewardsSummary;
  if (isCompleted) {
    rewardsSummary = calculateSeasonRewards(tempCampaign);
  }

  const updatedCampaign: SeasonCampaign = {
    ...tempCampaign,
    rewardsSummary,
  };

  saveSeasonCampaign(updatedCampaign);

  return {
    campaign: updatedCampaign,
    userMatch: userFixture,
    matchdaySummary: matchdayFixtures,
  };
}

/**
 * Simulate the current matchday entirely (User match + other 9 league matches)
 * Randomises goalscorers across the user squad!
 */
export function simulateCurrentMatchday(
  campaign: SeasonCampaign,
  userOvr: number = 88,
  starCardNameOrSquad: string | (PlayerCard | undefined | null)[] = 'Squad Striker'
): { campaign: SeasonCampaign; userMatch: LeagueFixture } {
  const currentMatchday = campaign.currentMatchday;
  const userFixture = campaign.fixtures.find(f => f.matchday === currentMatchday && f.isUserMatch);

  if (!userFixture) {
    throw new Error(`No user fixture found for matchday ${currentMatchday}`);
  }

  const isUserHome = userFixture.homeTeamId === 'user_squad';
  const opponentRating = isUserHome ? userFixture.awayTeamRating : userFixture.homeTeamRating;

  const simResult = simulateMatch(
    isUserHome ? userOvr : opponentRating,
    isUserHome ? opponentRating : userOvr,
    ['Striker', 'Midfielder', 'Forward'],
    ['Opponent Star', 'Opponent Winger']
  );

  const userScore = isUserHome ? simResult.homeScore : simResult.awayScore;
  const cpuScore = isUserHome ? simResult.awayScore : simResult.homeScore;

  // Generate realistic squad goalscorers across team
  let userScorers: string[] = [];
  if (Array.isArray(starCardNameOrSquad)) {
    userScorers = generateSquadGoalscorers(starCardNameOrSquad, userScore, 'Apex Striker');
  } else {
    userScorers = Array(userScore).fill(starCardNameOrSquad);
  }

  const res = playUserMatchInSeason(campaign, userScore, cpuScore, userScorers);
  return { campaign: res.campaign, userMatch: res.userMatch };
}

/**
 * Simulate remaining season (every remaining matchday from current up to 38)
 * Randomises goalscorers across the team for all simulated fixtures!
 */
export function simulateRemainingSeason(
  campaign: SeasonCampaign,
  userOvr: number = 88,
  starCardNameOrSquad: string | (PlayerCard | undefined | null)[] = 'Squad Striker'
): SeasonCampaign {
  let activeCampaign = { ...campaign };

  while (!activeCampaign.isCompleted && activeCampaign.currentMatchday <= 38) {
    const res = simulateCurrentMatchday(activeCampaign, userOvr, starCardNameOrSquad);
    activeCampaign = res.campaign;
  }

  return activeCampaign;
}

/**
 * Reset campaign or advance to next 38-match season
 */
export function startNew38Season(
  previousCampaign?: SeasonCampaign,
  userSquadName: string = 'Apex FC',
  userOvr: number = 88
): SeasonCampaign {
  const nextSeasonNum = previousCampaign ? previousCampaign.seasonNumber + 1 : 1;
  const newCamp = createNewSeasonCampaign(nextSeasonNum, userSquadName, userOvr);
  saveSeasonCampaign(newCamp);
  return newCamp;
}
