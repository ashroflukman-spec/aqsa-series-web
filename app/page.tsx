import { Home, BookOpen, Heart, Settings } from "lucide-react";
import { seriesList } from "../data/series";

export default function Page() {
  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#0f1115] to-[#1a1d24] text-white flex justify-center overflow-hidden">

      {/* RED AMBIENT GLOW */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[#7A1F2B] opacity-20 blur-[120px] rounded-full pointer-events-none" />

      {/* MOBILE CONTAINER */}
      <div className="w-full max-w-md min-h-screen flex flex-col relative z-10">

        {/* CONTENT AREA */}
        <div className="flex-1 px-6 py-8">

          {/* HEADER */}
          <header className="flex items-center justify-between mb-8">
            <div className="text-xl font-bold tracking-wide">
              Aqsa Series
            </div>
            <div className="text-gray-400 text-lg cursor-pointer">
              🔍
            </div>
          </header>

          {/* CONTINUE LISTENING */}
          <section className="mb-10">
            <h2 className="text-sm text-gray-400 mb-3 uppercase tracking-wider">
              Continue Listening
            </h2>

            <div className="bg-[#1f232b] rounded-2xl p-5 shadow-xl shadow-black/40">
              <h3 className="text-lg font-semibold">
                Mukadimah
              </h3>

              <p className="text-gray-400 text-sm mt-1">
                Perancangan Strategik Pembebasan Baitulmaqdis
              </p>

              <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-[#7A1F2B]" />
              </div>

              <div className="mt-4 flex items-center gap-4 text-gray-300 text-lg">
                ⏮️ ⏸️ ⏭️
              </div>
            </div>
          </section>

          {/* POPULAR SERIES */}
          <section>
            <h2 className="text-sm text-gray-400 mb-4 uppercase tracking-wider">
              Popular Series
            </h2>

            <div className="space-y-6">
              {seriesList.map((series) => (
                <div
                  key={series.id}
                  className="relative h-48 rounded-2xl overflow-hidden cursor-pointer group"
                >
                  {/* IMAGE */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${series.image})` }}
                  />

                  {/* DARK OVERLAY */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                  {/* CONTENT */}
                  <div className="relative z-10 p-5 flex flex-col justify-end h-full">
                    <h3 className="text-lg font-semibold">
                      {series.title}
                    </h3>

                    <p className="text-gray-300 text-sm mt-1">
                      {series.totalEpisodes} Bab
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* PREMIUM BOTTOM NAV */}
       <nav className="relative px-4 pb-6">

  {/* UNDER GLOW LEMBUT */}
  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-72 h-20 bg-red-700 blur-3xl opacity-30 rounded-full"></div>

  {/* GLASS CONTAINER */}
  <div className="relative backdrop-blur-2xl bg-[#14161b]/70 border border-white/5 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">

    <div className="flex items-center">

      {/* ACTIVE FULL SEGMENT */}
      <div className="flex-1 relative">

        {/* FULL GRADIENT FILL */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-red-600 to-red-900"></div>

        {/* INNER SHADOW DEPTH */}
        <div className="absolute inset-0 shadow-inner shadow-black/40"></div>

        <div className="relative flex flex-col items-center justify-center py-4">
          <Home size={22} strokeWidth={3} className="text-white" />
          <span className="text-xs mt-1 text-white font-semibold tracking-wide">
            Home
          </span>
        </div>

      </div>

      {/* OTHER TABS */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 text-gray-400 hover:text-white transition">
        <BookOpen size={22} />
        <span className="text-xs mt-1">Library</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-4 text-gray-400 hover:text-white transition">
        <Heart size={22} />
        <span className="text-xs mt-1">Favorites</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-4 text-gray-400 hover:text-white transition">
        <Settings size={22} />
        <span className="text-xs mt-1">Settings</span>
      </div>

    </div>

  </div>
</nav>

      </div>

    </main>
  );
}