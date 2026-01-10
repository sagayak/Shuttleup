
import React from 'react';
import { Profile } from '../types';
import { supabase } from '../supabaseClient';

interface NavbarProps {
  profile: Profile | null;
  onNavigate: (page: string, params?: any) => void;
}

const Navbar: React.FC<NavbarProps> = ({ profile, onNavigate }) => {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => onNavigate('dashboard')}
        >
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bebas text-2xl rotate-12">
            S
          </div>
          <span className="text-xl font-bold tracking-tight">ShuttleUp</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <button onClick={() => onNavigate('dashboard')} className="hover:text-blue-600">Home</button>
          <button className="hover:text-blue-600">Tournaments</button>
          <button className="hover:text-blue-600">Rulebook</button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Credits</span>
            <span className="text-sm font-bold text-blue-600">₹{profile?.credits || 0}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
             {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
