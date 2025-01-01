const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["like", "comment", "reply"],
      required: true,
    },
    blog: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "BlogData",
    },
    notification_for: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "SignUpData",
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "SignUpData",
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comments",
    },
    reply: {
      type: Schema.Types.ObjectId,
      ref: "Comments",
    },
    replied_on_comment: {
      type: Schema.Types.ObjectId,
      ref: "Comments",
    },
    seen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Notifications = mongoose.model("Notifications", notificationSchema);
module.exports = Notifications;
