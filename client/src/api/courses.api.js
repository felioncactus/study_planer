import { http } from "./http";

export async function apiListCourses() {
  const res = await http.get("/courses");
  return res.data; // { courses }
}

export async function apiGetCourse(courseId) {
  const res = await http.get(`/courses/${courseId}`);
  return res.data; // { course }
}

export async function apiCreateCourse(formDataOrPayload) {
  // Supports both JSON payload and FormData (for image/banner uploads)
  const isForm = typeof FormData !== "undefined" && formDataOrPayload instanceof FormData;
  const res = await http.post("/courses", formDataOrPayload, {
    headers: isForm ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return res.data; // { course }
}

export async function apiUpdateCourse(courseId, formDataOrPayload) {
  const isForm = typeof FormData !== "undefined" && formDataOrPayload instanceof FormData;
  const res = await http.put(`/courses/${courseId}`, formDataOrPayload, {
    headers: isForm ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return res.data; // { course }
}

export async function apiDeleteCourse(courseId) {
  await http.delete(`/courses/${courseId}`);
}
