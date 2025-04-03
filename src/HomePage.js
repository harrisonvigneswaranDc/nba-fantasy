import React from "react";
import { Link } from "react-router-dom"; 
import Header from "./Header";

function HomePage() {
  return (
    <div className="font-sans bg-gray-900 min-h-screen flex flex-col text-gray-200">
      <Header />

      {/* Main */}
      <div className="flex-1 px-4 md:px-8 py-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">
        {/* About Our League */}
        <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:shadow-purple-900/60 transition-all duration-300">
          <h2 className="text-xl font-bold text-purple-400 mb-3">About Our League</h2>
          <ul className="list-disc ml-6 space-y-2 text-gray-300">
            <li>Soft and Hard Caps, Salary Exceptions, Realistic GM Tools</li>
            <li>Draft new players or keep your favorites</li>
            <li>Compete against friends or public leagues</li>
          </ul>
        </section>

        {/* Quick Preview */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:shadow-purple-900/60 transition-all duration-300">
          <div className="flex justify-between items-center font-bold mb-4 text-purple-400">
            <span className="text-lg">Practice Fantasy Matchup</span>
            <span className="text-xl">&raquo;</span>
          </div>
  
          <div className="flex justify-between items-center">
            <div className="flex flex-col items-center flex-1 p-3 bg-gray-700/50 rounded-lg">
              <div className="text-center">
                <div className="font-semibold">Battery Brains</div>
                <div className="text-sm text-gray-400">(3-8-0 | 12th)</div>
              </div>
              <div className="text-2xl font-bold mt-2 text-purple-300">569.50</div>
            </div>
    
            <div className="px-4 py-2 font-bold text-purple-500">VS</div>
    
            <div className="flex flex-col items-center flex-1 p-3 bg-gray-700/50 rounded-lg">
              <div className="text-center">
                <div className="font-semibold">Raptors Revenge</div>
                <div className="text-sm text-gray-400">(10-1-0 | 1st)</div>
              </div>
              <div className="text-2xl font-bold mt-2 text-purple-300">904.30</div>
            </div>
          </div>
        </div>

        {/* Join / Create League */}
        <div className="flex gap-6 flex-wrap">
          <section className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:shadow-purple-900/60 transition-all duration-300">
            <div className="flex gap-6 flex-wrap">
              <div className="flex-1 min-w-[250px] flex flex-col items-start gap-3">
                <h2 className="text-xl font-bold text-purple-400 mb-1">Create Your Own League</h2>
                <Link to="./live-draft-page" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold border-0 px-6 py-3 rounded-lg cursor-pointer transition-colors duration-200 shadow-md hover:shadow-purple-900/50">Create a League</button>
                </Link>
                <p className="text-gray-400 italic">"Be a commissioner, set the rules, invite your friends to play"</p>
              </div>
            </div>
          </section>

          <section className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:shadow-purple-900/60 transition-all duration-300">
            <h2 className="text-xl font-bold text-purple-400 mb-3">Practice Your Fantasy Draft</h2>
            <p className="text-gray-400 italic mb-4">Test your drafting skills and strategies before the real thing!</p>
            <Link to="./practice-draft">
              <button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold border-0 px-6 py-3 rounded-lg cursor-pointer transition-colors duration-200 shadow-md hover:shadow-purple-900/50">Start Practice Draft</button>
            </Link>
          </section>
        </div>

      </div>
    </div>
  );
}

export default HomePage;
