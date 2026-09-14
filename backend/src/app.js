const dotenv = require("dotenv");
console.log("1. Loading dotenv...");
dotenv.config();
console.log("2. Dotenv loaded");

const http = require("http");
console.log("3. http loaded");

const express = require("express");
console.log("4. express loaded");

const cors = require("cors");
console.log("5. cors loaded");

const { Server } = require("socket.io");
console.log("6. socket.io loaded");

const { initChatSocket } = require("./sockets/chat.socket");
console.log("7. chat socket loaded");

const { initFeedSocket } = require("./sockets/feed.socket");
console.log("8. feed socket loaded");

const { initNotificationSocket } = require("./sockets/notification.socket");
console.log("9. notification socket loaded");

const { initMeetingSocket } = require("./sockets/meeting.socket");
console.log("10. meeting socket loaded");

const db = require("./db/knex");
console.log("11. knex loaded");

const authRoutes = require("./routes/auth.routes");
console.log("12. auth routes loaded");

const anoRoutes = require("./routes/ano.routes");
console.log("13. ano routes loaded");

const cadetRoutes = require("./routes/cadet.routes");
console.log("14. cadet routes loaded");

const chatRoutes = require("./routes/chat.routes");
console.log("15. chat routes loaded");

const postRoutes = require("./routes/post.routes");
console.log("16. post routes loaded");

const donationRoutes = require("./routes/donation.routes");
console.log("17. donation routes loaded");

const notificationRoutes = require("./routes/notification.routes");
console.log("18. notification routes loaded");

const attendanceRoutes = require("./modules/attendance/attendance.routes");
console.log("19. attendance routes loaded");

const quizRoutes = require("./modules/quiz/routes/quiz.routes");
console.log("20. quiz routes loaded");

const leaveRoutes = require("./modules/leave/leave.routes");
console.log("21. leave routes loaded");

const fineRoutes = require("./modules/fines/fine.routes");
console.log("22. fine routes loaded");

const meetingRoutes = require("./modules/meetings/meeting.routes");
console.log("23. meeting routes loaded");

const communityRoutes = require("./modules/community/community.routes");
console.log("24. community routes loaded");

const { startCommunityPollNotifier } = require("./modules/community/community.poll-notifier");
console.log("25. community notifier loaded");

const voiceRoutes = require("./routes/voice.routes");
console.log("26. voice routes loaded");

const intelligenceRoutes = require("./modules/intelligence/intelligence.routes");
const decisionRoutes = require("./modules/decision/decision.routes");
console.log("27. intelligence routes loaded");

const app = express();
console.log("28. express app created");

const server = http.createServer(app);
console.log("29. HTTP server created");

const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});
console.log("30. Socket.IO initialized");

// Make io globally accessible
app.locals.io = io;
app.set("io", io);
app.locals.onlineUsers = new Set();

io.on("connection", (socket) => {
  console.log(`[socket] connected ${socket.id}`);

  socket.on("join_college", (college_id) => {
    const normalizedCollegeId = Number(college_id);
    if (!Number.isInteger(normalizedCollegeId) || normalizedCollegeId <= 0) return;
    socket.join(`college_${normalizedCollegeId}`);
  });
});

console.log("31. Initializing sockets...");
initChatSocket(io, { onlineUsers: app.locals.onlineUsers });
initFeedSocket(io);
initNotificationSocket(io);
initMeetingSocket(io);
startCommunityPollNotifier(io);
console.log("32. Sockets initialized");

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = Buffer.from(buf);
    },
  })
);

console.log("33. Middleware registered");

app.get("/", async (req, res) => {
  try {
    await db.raw("SELECT 1+1 as result");
    res.status(200).json({
      status: "Online",
      database: "Connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Database Connection Error:", err);
    res.status(500).json({
      status: "Error",
      message: "Database not connected",
    });
  }
});

console.log("34. Health route registered");

app.use("/api/auth", authRoutes);
app.use("/api/ano", anoRoutes);
app.use("/api/cadet", cadetRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/fines", fineRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/intel", intelligenceRoutes);
app.use("/api/decision", decisionRoutes);

console.log("35. Routes registered");

app.use((err, req, res, next) => {
  if (err?.name === "MulterError") {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file exceeds 10MB limit"
        : err.message || "Upload error";
    return res.status(status).json({ message });
  }

  const status = Number(err.status || err.statusCode || 500);
  const message = status >= 500 ? "Internal Server Error" : err.message;
  console.error("Global Error:", err.stack || err);
  res.status(status).json({
    message,
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : undefined,
  });
});

console.log("36. Error handler registered");

const PORT = process.env.PORT || 5000;

console.log("37. About to start server...");

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});