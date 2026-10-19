import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createStore } from "../server/store.js";
import { createApp } from "../server/app.js";
test("classroom enrollment, submissions, feedback, sessions and access boundaries", async (t) => {
  const db = createStore(":memory:");
  const origin = "http://localhost:4173";
  const app = createApp({
    db,
    origin,
    clientId: "test-client",
    verifyGoogle: async (token) => {
      if (!["teacher-a", "teacher-b"].includes(token)) throw Error("bad token");
      return {
        sub: token,
        name: token,
        email: token + "@example.test",
        email_verified: true,
      };
    },
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.close();
    db.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, body, cookie, customOrigin = origin) {
    const res = await fetch(base + "/api" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Origin: customOrigin,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return {
      status: res.status,
      data: await res.json(),
      cookie: res.headers.get("set-cookie")?.split(";")[0],
    };
  }
  const teacherA = (await request("/auth/google", { credential: "teacher-a" }))
    .cookie;
  const teacherB = (await request("/auth/google", { credential: "teacher-b" }))
    .cookie;
  assert.ok(teacherA);
  assert.equal(
    (await request("/auth/google", { credential: "forged" })).status,
    401,
  );
  assert.equal(
    (await request("/classes", { name: "bad" }, undefined)).status,
    403,
  );
  assert.equal(
    (await request("/classes", { name: "bad" }, teacherA, "https://evil.test"))
      .status,
    403,
  );
  const classroom = await request("/classes", { name: "7. A" }, teacherA);
  assert.equal(classroom.status, 201);
  assert.equal(classroom.data.code.length, 10);
  const id = classroom.data.id;
  assert.equal(
    (await request("/classes/" + id, undefined, teacherB)).status,
    404,
  );
  const student = await request("/auth/join", {
    code: classroom.data.code,
    nickname: "RobotKata",
  });
  assert.equal(student.status, 200);
  const studentCookie = student.cookie;
  assert.equal(
    (
      await request("/auth/join", {
        code: classroom.data.code.toLowerCase(),
        nickname: "robotkata",
      })
    ).status,
    409,
  );
  assert.equal(
    (await request("/auth/join", { code: "INVALID123", nickname: "Other" }))
      .status,
    404,
  );
  assert.equal(
    (await request("/classes", { name: "student attempt" }, studentCookie))
      .status,
    403,
  );
  const assignment = await request(
    `/classes/${id}/assignments`,
    { title: "Square", instructions: "Drive a square", lesson: "square" },
    teacherA,
  );
  assert.equal(assignment.status, 201);
  assert.equal(
    (
      await request(
        `/classes/${id}/assignments`,
        { title: "intruder", instructions: "bad" },
        teacherB,
      )
    ).status,
    404,
  );
  const project = {
    version: 1,
    id: "my-project",
    name: "Square",
    mode: "blocks",
    python: 'print("hello")',
    workspace: { blocks: { languageVersion: 0, blocks: [] } },
  };
  assert.equal(
    (
      await request(
        `/assignments/${assignment.data.id}/submit`,
        { project },
        studentCookie,
      )
    ).status,
    200,
  );
  let detail = (await request("/classes/" + id, undefined, teacherA)).data;
  assert.equal(detail.submissions.length, 1);
  assert.equal(detail.students[0].nickname, "RobotKata");
  const submission = detail.submissions[0];
  assert.equal(
    (
      await request(
        "/submissions/" + submission.id + "/feedback",
        { feedback: "Great work!" },
        teacherB,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await request(
        "/submissions/" + submission.id + "/feedback",
        { feedback: "Great work!" },
        teacherA,
      )
    ).status,
    200,
  );
  const studentDetail = (
    await request("/classes/" + id, undefined, studentCookie)
  ).data;
  assert.deepEqual(studentDetail.students, []);
  assert.equal(studentDetail.submissions[0].feedback, "Great work!");
  assert.equal(studentDetail.classroom.code, undefined);
  project.python = 'print("updated")';
  await request(
    `/assignments/${assignment.data.id}/submit`,
    { project },
    studentCookie,
  );
  detail = (await request("/classes/" + id, undefined, teacherA)).data;
  assert.equal(detail.submissions.length, 1);
  assert.equal(detail.submissions[0].project.python, project.python);
  const other = await request("/auth/join", {
    code: classroom.data.code,
    nickname: "Other",
  });
  assert.equal(
    (await request("/classes/" + id, undefined, other.cookie)).data.submissions
      .length,
    0,
  );
  await request("/auth/logout", {}, studentCookie);
  assert.equal(
    (await request("/me", undefined, studentCookie)).data.user,
    null,
  );
  assert.equal(
    (await request("/classes/" + id, undefined, studentCookie)).status,
    401,
  );
});
test("Google login is unavailable until a real client ID is configured", async (t) => {
  const db = createStore(":memory:"),
    app = createApp({ db });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.close();
    db.close();
  });
  const res = await fetch(
    `http://127.0.0.1:${server.address().port}/api/auth/google`,
    {
      method: "POST",
      headers: {
        Origin: "http://localhost:4173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ credential: "anything" }),
    },
  );
  assert.equal(res.status, 503);
});
