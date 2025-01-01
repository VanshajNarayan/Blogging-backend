const express = require("express");
const {
  Signup,
  Signin,
  CreateBlog,
  LatestBlogs,
  TrendingBlogs,
  SearchBlogs,
  SearchQuery,
  SearchUser,
  UserProfile,
  UserBlogs,
  GetBlog,
  SimilarBlog,
  LikedBlog,
  LikeInfomation,
  AddComment,
  GetBlogCommentData,
  GetAddReply,
  ChangePassword,
  EditProfileSettings,
  UpdateProfileImage,
  UpdateEditProfile,
  GetNewNotifications,
  NotificationsData,
  UserWrittenBlogs,
  DeleteBlog,
} = require("../controllers/Controllers");
const { jwtVerify } = require("../JwtVerify/JwtVerify");

const router = express.Router();

router.route("/signup").post(Signup);
router.route("/signin").post(Signin);
router.route("/change-password").post(jwtVerify, ChangePassword);
router.route("/updated-profile-image").post(jwtVerify, UpdateProfileImage);
router.route("/update-edit-profile").post(jwtVerify, UpdateEditProfile);
router.route("/create-blog").post(jwtVerify, CreateBlog);
router.route("/latest-blogs").get(LatestBlogs);
router.route("/trending-blogs").get(TrendingBlogs);
router.route("/search-blogs").post(SearchBlogs);
router.route("/search-query").get(SearchQuery);
router.route("/search-users").get(SearchUser);
router.route("/get-profile").get(UserProfile);
router.route("/edit-profile").post(EditProfileSettings);
router.route("/user-blogs").get(UserBlogs);
router.route("/get-blog").post(GetBlog);
router.route("/similar-blogs").get(SimilarBlog);
router.route("/like-blog").post(jwtVerify, LikedBlog);
router.route("/isliked-by-user").post(jwtVerify, LikeInfomation);
router.route("/add-comment").post(jwtVerify, AddComment);
router.route("/get-blog-comments").post(GetBlogCommentData);
router.route("/get-comments-reply").post(jwtVerify, GetAddReply);
router.route("/new-notification").get(jwtVerify, GetNewNotifications);
router.route("/notifications").post(jwtVerify, NotificationsData);
router.route("/user-written-blogs").post(jwtVerify, UserWrittenBlogs);
router.route("/delete-blogs").post(jwtVerify, DeleteBlog);

// router.route("/get-upload-url").get(UploadUrl);

module.exports = router;
