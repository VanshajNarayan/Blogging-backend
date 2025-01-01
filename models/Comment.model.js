const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const commentSchema = new mongoose.Schema(
  {
    blog_id: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "BlogData",
    },
    blog_author: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "BlogData",
    },
    comment: {
      type: String,
      required: true,
    },
    children: {
      type: [Schema.Types.ObjectId],
      ref: "Comments",
    },
    commented_by: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: "SignUpData",
    },
    isReply: {
      type: Boolean,
      default: false,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Comments",
    },
  },
  {
    timestamps: {
      createdAt: "commentedAt",
    },
  }
);

const Comments = mongoose.model("Comments", commentSchema);

module.exports = Comments;
