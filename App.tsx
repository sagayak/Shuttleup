import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import AuthPage from "./pages/AuthPage";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setProfileReady(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    let retries = 0;

    const waitForProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfileReady(true);
      } else if (retries < 3) {
        retries++;
        setTimeout(waitForProfile, 800);
      }
    };

    waitForProfile();
  }, [user]);

  if (!user) return <AuthPage />;
  if (!profileReady) return <p>Syncing profile...</p>;

  return <div>Profile ready</div>;
}
