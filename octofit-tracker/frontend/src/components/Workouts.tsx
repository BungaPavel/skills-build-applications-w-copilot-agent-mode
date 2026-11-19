import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = { _id?: string; title: string; reason: string };

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: WorkoutSuggestion[] }>('/api/workouts/suggestions/mona%40example.com')
      .then(({ suggestions: results }) => {
        if (active) setSuggestions(results);
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
        <h2 className="h4">Workout suggestions</h2>
        {loading ? <p role="status">Loading workout suggestions...</p> : error ? (
          <p className="alert alert-danger" role="alert">Unable to load workout suggestions: {error}</p>
        ) : suggestions.length === 0 ? (
          <p>No workout suggestions available.</p>
        ) : (
          <ul className="list-group">
            {suggestions.map((suggestion, index) => (
              <li className="list-group-item" key={suggestion._id ?? `${suggestion.title}-${index}`}>
                <h3 className="h5">{suggestion.title}</h3>
                <p className="mb-0">{suggestion.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
