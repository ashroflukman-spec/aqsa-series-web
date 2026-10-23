import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  mergeListeningProgress,
  parseListeningProgress,
  readListeningProgress,
  writeListeningProgress,
  type ListeningProgress,
} from "./listeningProgress";

export type ListeningSyncStatus = "idle" | "syncing" | "ready" | "error";

function listeningCollection(uid: string) {
  return collection(db, "users", uid, "listening");
}

export async function pushListeningProgress(uid: string, item: ListeningProgress): Promise<void> {
  await setDoc(doc(listeningCollection(uid), item.episodeId), item);
}

export async function connectListeningSync(
  uid: string,
  onStatus: (status: ListeningSyncStatus) => void,
  isActive: () => boolean,
): Promise<() => void> {
  const recentQuery = query(listeningCollection(uid), orderBy("updatedAt", "desc"), limit(10));
  try {
    const snapshot = await getDocs(recentQuery);
    const remote = snapshot.docs
      .map((item) => parseListeningProgress(item.data()))
      .filter((item): item is ListeningProgress => item !== null);
    if (!isActive()) return () => {};
    const local = readListeningProgress();
    writeListeningProgress(mergeListeningProgress(remote, local));

    const remoteById = new Map(remote.map((item) => [item.episodeId, item]));
    const upload = local.filter((item) => {
      const saved = remoteById.get(item.episodeId);
      return !saved || item.updatedAt > saved.updatedAt;
    });
    const results = await Promise.allSettled(upload.map((item) => pushListeningProgress(uid, item)));
    if (!isActive()) return () => {};
    const uploadFailed = results.some((result) => result.status === "rejected");
    if (uploadFailed) onStatus("error");

    return onSnapshot(recentQuery, (nextSnapshot) => {
      if (!isActive()) return;
      const items = nextSnapshot.docs
        .map((item) => parseListeningProgress(item.data()))
        .filter((item): item is ListeningProgress => item !== null);
      writeListeningProgress(mergeListeningProgress(items, readListeningProgress()));
      if (!uploadFailed && !nextSnapshot.metadata.hasPendingWrites) onStatus("ready");
    }, () => { if (isActive()) onStatus("error"); });
  } catch {
    if (isActive()) onStatus("error");
    return () => {};
  }
}
