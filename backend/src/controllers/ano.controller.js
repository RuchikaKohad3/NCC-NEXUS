import db from "../db/knex.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendMail } from "../utils/mailer.js";

export const createUser = async (req, res) => {
  const {
    username,
    email,
    role,
    college_id,
    regimental_no,
    name,
    dob,
    graduation_year,
  } = req.body;

  if (!["CADET", "ALUMNI"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const tempPassword = crypto.randomBytes(4).toString("hex");
  const password_hash = await bcrypt.hash(tempPassword, 10);

  try {
    await db.transaction(async (trx) => {

      const [user] = await trx("users")
        .insert({
          username,
          email,
          password_hash,
          role,
          college_id,
        })
        .returning("*");

      if (role === "CADET") {
        await trx("cadet_profiles").insert({
          regimental_no,
          user_id: user.user_id,
          name,
          dob,
          email,
        });
      }

      if (role === "ALUMNI") {
        await trx("alumni").insert({
          user_id: user.user_id,
          graduation_year,
        });
      }
    });

    await sendMail({
      to: email,
      subject: "NCC Nexus Login Credentials",
      html: `
        <h3>Welcome to NCC Nexus</h3>
        <p>${name}</p>
        <p>Temporary Password: <b>${tempPassword}</b></p>
        <p>Please reset your password after login.</p>
      `,
    });

    res.json({ message: "User created & email sent" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
