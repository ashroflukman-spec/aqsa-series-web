// lib/markers.js

export function getMarkerStorageKey(audioId) {
  return `aqsa_markers_${audioId}`;
}

export function loadMarkers(audioId) {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(getMarkerStorageKey(audioId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Gagal baca marker:", error);
    return [];
  }
}

export function saveMarkers(audioId, markers) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      getMarkerStorageKey(audioId),
      JSON.stringify(markers)
    );
  } catch (error) {
    console.error("Gagal simpan marker:", error);
  }
}

export function addMarkerToStorage(audioId, marker) {
  const current = loadMarkers(audioId);
  const updated = [...current, marker].sort((a, b) => a.time - b.time);
  saveMarkers(audioId, updated);
  return updated;
}

export function deleteMarkerFromStorage(audioId, markerId) {
  const current = loadMarkers(audioId);
  const updated = current.filter((marker) => marker.id !== markerId);
  saveMarkers(audioId, updated);
  return updated;
}

export function updateMarkerInStorage(audioId, markerId, updates) {
  const current = loadMarkers(audioId);

  const updated = current
    .map((marker) =>
      marker.id === markerId ? { ...marker, ...updates } : marker
    )
    .sort((a, b) => a.time - b.time);

  saveMarkers(audioId, updated);
  return updated;
}

export function clearMarkersFromStorage(audioId) {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(getMarkerStorageKey(audioId));
  } catch (error) {
    console.error("Gagal padam semua marker:", error);
  }
}