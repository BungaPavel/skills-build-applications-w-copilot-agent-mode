import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type TeamMember = string | { _id?: string; name?: string; email?: string };
type Team = { _id?: string; name: string; members: TeamMember[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams: results }) => {
        if (active) setTeams(results);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unknown error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Teams</h2>
        {loading ? <p role="status">Loading teams...</p> : error ? (
          <p className="alert alert-danger" role="alert">Unable to load teams: {error}</p>
        ) : teams.length === 0 ? (
          <p>No teams yet.</p>
        ) : (
          <ul className="list-group">
            {teams.map((team, index) => (
              <li className="list-group-item" key={team._id ?? `${team.name}-${index}`}>
                <h3 className="h5">{team.name}</h3>
                {team.members.length > 0 ? (
                  <ul aria-label={`${team.name} members`}>
                    {team.members.map((member, memberIndex) => {
                      const label = typeof member === 'string'
                        ? member
                        : member.name ?? member.email ?? member._id ?? 'Team member';
                      return <li key={typeof member === 'string' ? member : member._id ?? `${label}-${memberIndex}`}>{label}</li>;
                    })}
                  </ul>
                ) : <p>No members yet.</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
