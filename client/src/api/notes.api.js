import { http } from "./http";

export async function apiListCourseNotes(courseId) {
  const res = await http.get(`/courses/${courseId}/notes`);
  return res.data;
}

export async function apiCreateCourseNote(courseId, payload) {
  const res = await http.post(`/courses/${courseId}/notes`, payload);
  return res.data;
}

export async function apiGetNote(noteId) {
  const res = await http.get(`/notes/${noteId}`);
  return res.data;
}

export async function apiUpdateNote(noteId, payload) {
  const res = await http.put(`/notes/${noteId}`, payload);
  return res.data;
}

export async function apiDeleteNote(noteId) {
  await http.delete(`/notes/${noteId}`);
}
