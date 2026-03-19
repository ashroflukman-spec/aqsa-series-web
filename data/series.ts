export type Episode = {
  id: string
  title: string
  audio: string
}

export type Series = {
  id: string
  title: string
  image: string
  episodes: Episode[]
}

export const seriesList: Series[] = [

  {
    id: "aqsa-strategic",
    title: "Perancangan Strategik Pembebasan Baitulmaqdis",
    image:
      "https://images.unsplash.com/photo-1549880181-56a44cf4a9a9?q=80&w=1600&auto=format&fit=crop",

    episodes: [

      {
        id: "ep1",
        title: "Bab 1 – Mukadimah",
        audio:
          "/audio/Hijjaz- Belaian Ibu KARAOKE.mp3",
      },

      {
        id: "ep2",
        title: "Bab 2 – Kedudukan Al-Aqsa",
        audio:
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      },

      {
        id: "ep3",
        title: "Bab 3 – Strategi Pembebasan",
        audio:
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      },

    ],
  },

  {
    id: "isra-mikraj",
    title: "Isra' Mikraj – Batu Lonjakan Pertama",
    image:
      "https://images.unsplash.com/photo-1509099836639-18ba1795216d?q=80&w=1600&auto=format&fit=crop",

    episodes: [

      {
        id: "ep1",
        title: "Bab 1 – Mukjizat Isra'",
        audio:
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      },

      {
        id: "ep2",
        title: "Bab 2 – Perjalanan ke Langit",
        audio:
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
      },

    ],
  },

  {
    id: "peranan-ummah",
    title: "Peranan Ummah Dalam Pembebasan",
    image:
      "https://images.unsplash.com/photo-1578922746465-3a80a228f223?q=80&w=1600&auto=format&fit=crop",

    episodes: [

      {
        id: "ep1",
        title: "Bab 1 – Kesedaran Ummah",
        audio:
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
      },

      {
        id: "ep2",
        title: "Bab 2 – Peranan Generasi",
        audio:
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
      },

    ],
  },

];