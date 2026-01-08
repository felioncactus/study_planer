import { http } from "./http";

export async function apiListCourses() {
  const res = await http.get("/courses");
  return res.data; // { courses }
}

export async function apiCreateCourse(payload) {
  const res = await http.post("/courses", payload);
  return res.data; // { course }
}

export async function apiDeleteCourse(courseId) {
  await http.delete(`/courses/${courseId}`);
}
