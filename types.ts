
export type UserRole = 'superadmin' | 'admin' | 'player' | 'scorer';

export interface Profile {
  id: string;
  user_numeric_id: number;
  username: string;
  full_name: string;
  role: UserRole;
  credits: number;
  created_at: string;
}

export interface Tournament {
  id: string;
  tournament_numeric_id: number;
  name: string;
  organizer_id: string;
  start_date: string;
  end_date: string;
  location: string;
  lat_lng?: { lat: number; lng: number };
  format: 'league' | 'knockout';
  privacy: 'public' | 'protected';
  player_limit?: number;
  team_limit?: number;
  scorer_pin?: string;
  is_locked: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  tournament_id: string;
  name: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  profile_id: string;
  profile?: Profile;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  match_order: number;
  team_a_id: string;
  team_b_id: string;
  umpire_name: string;
  scheduled_time: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  score_a: number;
  score_b: number;
  sets_won_a: number;
  sets_won_b: number;
  winner_team_id?: string;
  max_points: number;
  current_set: number;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  profile_id: string;
  amount: number;
  type: 'purchase' | 'deduction' | 'refund' | 'admin_override';
  description: string;
  razorpay_payment_id?: string;
  created_at: string;
}
