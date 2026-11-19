import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Activity input must be an object'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (typeof userId !== 'string' || typeof teamId !== 'string' || typeof type !== 'string' || !type.trim() ||
      typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw Object.assign(new Error('userId, teamId, type, and positive minutes are required'), { status: 400 });
  }
  if (!/^[a-f\d]{24}$/i.test(userId) || !/^[a-f\d]{24}$/i.test(teamId)) {
    throw Object.assign(new Error('userId and teamId must be valid ObjectIds'), { status: 400 });
  }

  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!userExists || !teamExists) {
    throw Object.assign(new Error('Referenced user or team does not exist'), { status: 400 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Team input must be an object'), { status: 400 });
  }

  const { name, mascot, members } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim()) {
    throw Object.assign(new Error('Team name is required'), { status: 400 });
  }
  if (typeof mascot !== 'string' || !mascot.trim()) {
    throw Object.assign(new Error('Team mascot is required'), { status: 400 });
  }
  if (members !== undefined && (!Array.isArray(members) || members.some((member) => typeof member !== 'string'))) {
    throw Object.assign(new Error('Team members must be an array of user IDs'), { status: 400 });
  }

  const memberIds = (members as string[] | undefined) ?? [];
  if (memberIds.some((memberId) => !/^[a-f\d]{24}$/i.test(memberId))) {
    throw Object.assign(new Error('Team members must contain valid user IDs'), { status: 400 });
  }

  return Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: memberIds,
  });
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    {
      $lookup: {
        from: Team.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'team',
      },
    },
    { $unwind: '$team' },
    { $sort: { totalPoints: -1, 'team.name': 1 } },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
  ]);

  return totals.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).select('_id fitnessGoal').lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const [recentActivities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).select('type').lean(),
    Workout.find().lean(),
  ]);
  const normalizedGoal = user.fitnessGoal.trim().toLowerCase();
  const activityFocus = (type: string) => {
    const normalizedType = type.trim().toLowerCase();
    if (normalizedType === 'run' || normalizedType === 'cycle') return 'endurance';
    return normalizedType;
  };

  return workouts
    .map((workout) => {
      const normalizedFocus = workout.focus.trim().toLowerCase();
      const goalMatches = normalizedFocus === normalizedGoal;
      const matchingActivity = recentActivities.find(({ type }) => activityFocus(type) === normalizedFocus);
      const reasons = [
        ...(goalMatches ? [`Matches your fitness goal (${user.fitnessGoal}).`] : []),
        ...(matchingActivity ? [`Matches your recent ${matchingActivity.type} activity.`] : []),
      ];

      return { ...workout, reason: reasons.join(' '), score: Number(goalMatches) + Number(Boolean(matchingActivity)) };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ score: _score, ...workout }) => workout);
}

export { User };
