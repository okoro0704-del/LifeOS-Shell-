/** Live streams catalog + go-live notifications (local until Live backend binds). */

export type LiveStream = {
  id: string;
  host: string;
  title: string;
  viewers: number;
  startedAt: string;
  category: string;
};

const LIVE_KEY = "lifeos.live.active";
const NOTIF_KEY = "lifeos.notifications.local";

const DEMO: LiveStream[] = [
  {
    id: "live-1",
    host: "amaka.lens",
    title: "Lagoon golden hour · Live",
    viewers: 1284,
    startedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    category: "Creator",
  },
  {
    id: "live-2",
    host: "tunde.beats",
    title: "Studio session open mic",
    viewers: 842,
    startedAt: new Date(Date.now() - 28 * 60_000).toISOString(),
    category: "Music",
  },
  {
    id: "live-3",
    host: "learnverse.hub",
    title: "Night class Q&A",
    viewers: 456,
    startedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    category: "Edu",
  },
  {
    id: "live-4",
    host: "maya.films",
    title: "Set walkthrough",
    viewers: 2103,
    startedAt: new Date(Date.now() - 40 * 60_000).toISOString(),
    category: "Cinema",
  },
];

export function listLiveStreams(): LiveStream[] {
  try {
    const mine = localStorage.getItem(LIVE_KEY);
    if (!mine) return DEMO;
    const parsed = JSON.parse(mine) as LiveStream;
    return [parsed, ...DEMO.filter((d) => d.id !== parsed.id)];
  } catch {
    return DEMO;
  }
}

export function goLive(input: { host: string; title: string }): LiveStream {
  const stream: LiveStream = {
    id: `live-me-${Date.now()}`,
    host: input.host,
    title: input.title,
    viewers: 1,
    startedAt: new Date().toISOString(),
    category: "You",
  };
  try {
    localStorage.setItem(LIVE_KEY, JSON.stringify(stream));
  } catch {
    /* */
  }
  pushLiveNotification(stream);
  return stream;
}

export function endLive() {
  try {
    localStorage.removeItem(LIVE_KEY);
  } catch {
    /* */
  }
}

type LocalNotif = {
  id: string;
  title: string;
  body: string;
  href: string;
  at: string;
  unread: boolean;
};

function pushLiveNotification(stream: LiveStream) {
  const notif: LocalNotif = {
    id: `n-${stream.id}`,
    title: `${stream.host} is Live`,
    body: stream.title,
    href: "/app/live",
    at: new Date().toISOString(),
    unread: true,
  };
  try {
    const list = JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]") as LocalNotif[];
    localStorage.setItem(NOTIF_KEY, JSON.stringify([notif, ...list].slice(0, 40)));
  } catch {
    /* */
  }
  if (typeof Notification !== "undefined") {
    if (Notification.permission === "granted") {
      try {
        new Notification(notif.title, { body: notif.body });
      } catch {
        /* */
      }
    } else if (Notification.permission !== "denied") {
      void Notification.requestPermission().then((p) => {
        if (p === "granted") {
          try {
            new Notification(notif.title, { body: notif.body });
          } catch {
            /* */
          }
        }
      });
    }
  }
}

export function listLocalNotifications(): LocalNotif[] {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]") as LocalNotif[];
  } catch {
    return [];
  }
}
