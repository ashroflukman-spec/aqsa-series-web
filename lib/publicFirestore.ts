import { collection, query, where } from "firebase/firestore";
import { db } from "./firebase";

type PublishedCollection = "series" | "episodes" | "videos";

export function publishedContentQuery(name: PublishedCollection) {
  return query(
    collection(db, name),
    where("isPublished", "==", true),
    where("isDeleted", "==", false)
  );
}

export function publicSpeakersQuery() {
  return query(collection(db, "speakers"), where("isDeleted", "==", false));
}
