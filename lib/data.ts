export type Album = {
  id: string;
  artistId: string;
  artistName: string;
  title: string;
  releaseDate: string;
  coverUrl: string;
  intro: string;
  baseScore: number;
};

export type Artist = {
  id: string;
  name: string;
  bio: string;
  heroImage: string;
};

export const artists: Artist[] = [
  {
    id: "radiohead",
    name: "Radiohead",
    bio: "英国实验摇滚乐队，擅长把焦虑、科技与人性放入声音结构中。",
    heroImage:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "daftpunk",
    name: "Daft Punk",
    bio: "法国电子音乐双人组，以未来感叙事、采样编排与律动质感闻名。",
    heroImage:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1600&q=80"
  }
];

export const albums: Album[] = [
  {
    id: "ok-computer",
    artistId: "radiohead",
    artistName: "Radiohead",
    title: "OK Computer",
    releaseDate: "1997-05-21",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b273f9dce4c9dfca6e4b6a11dbda",
    intro: "后工业时代的不安情绪与旋律实验并置。",
    baseScore: 9.3
  },
  {
    id: "kid-a",
    artistId: "radiohead",
    artistName: "Radiohead",
    title: "Kid A",
    releaseDate: "2000-10-02",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2739d3ff78f2f7f3688a9d8d8e2",
    intro: "电子化与抽象表达并进，像冰冷梦境。",
    baseScore: 9.1
  },
  {
    id: "in-rainbows",
    artistId: "radiohead",
    artistName: "Radiohead",
    title: "In Rainbows",
    releaseDate: "2007-10-10",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b273cf55d6f7433f3b63f056f85c",
    intro: "亲密的人声与精密律动，温柔但危险。",
    baseScore: 9.0
  },
  {
    id: "discovery",
    artistId: "daftpunk",
    artistName: "Daft Punk",
    title: "Discovery",
    releaseDate: "2001-03-07",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b273b14af2f1ea5bb2f8f1266f03",
    intro: "法式触感与流行旋律完美结合。",
    baseScore: 8.9
  },
  {
    id: "random-access-memories",
    artistId: "daftpunk",
    artistName: "Daft Punk",
    title: "Random Access Memories",
    releaseDate: "2013-05-17",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b273b7f9f4e9f8f6732d0d3554a8",
    intro: "复古未来主义，致敬录音室黄金时代。",
    baseScore: 8.8
  },
  {
    id: "homework",
    artistId: "daftpunk",
    artistName: "Daft Punk",
    title: "Homework",
    releaseDate: "1997-01-17",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2738f3efdf17f4f4a7ab2d8e0f2",
    intro: "粗粝、直接、舞池友好，是法式 House 的里程碑。",
    baseScore: 8.6
  },
  {
    id: "a-moon-shaped-pool",
    artistId: "radiohead",
    artistName: "Radiohead",
    title: "A Moon Shaped Pool",
    releaseDate: "2016-05-08",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2732fbe7af95f299b96f2f87349",
    intro: "弦乐与电子细节编织出的晚期抒情。",
    baseScore: 8.7
  },
  {
    id: "human-after-all",
    artistId: "daftpunk",
    artistName: "Daft Punk",
    title: "Human After All",
    releaseDate: "2005-03-09",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b27334f7f8978ccf6d4d6a0f95bd",
    intro: "机械重复中的人性闪现，简陋但上瘾。",
    baseScore: 7.9
  }
];

export function getAlbumById(id: string) {
  return albums.find((a) => a.id === id);
}

export function getArtistById(id: string) {
  return artists.find((a) => a.id === id);
}

export function getAlbumsByArtistId(artistId: string) {
  return albums.filter((a) => a.artistId === artistId);
}
