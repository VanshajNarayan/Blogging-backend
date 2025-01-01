const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SignUpData = require("../models/Registration.model");
const BlogData = require("../models/Blog.model");
const Notifications = require("../models/Notification.model");
const Comments = require("../models/Comment.model");
// const { s3 } = require("../Aws/Aws");

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

// ! signup:-
const Signup = async (req, res) => {
  try {
    let { fullname, email, password } = req.body;

    if (fullname.length < 3) {
      return res.status(403).json({
        success: "false",
        message: "Fullname should be at least 3 characters long.",
      });
    }

    if (!email.length) {
      return res.status(403).json({
        success: "false",
        message: "Email is required.",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(403).json({
        success: "false",
        message: "Email is not valid.",
      });
    }

    if (!passwordRegex.test(password)) {
      return res.status(403).json({
        success: "false",
        message:
          "Password should be at lest 6 to 20 characters long with at least one uppercase letter, one lowercase letter and one number.",
      });
    }

    const hash_password = await bcrypt.hash(password, 10);

    // add the data to the database:-
    const userData = new SignUpData({
      fullname,
      email,
      password: hash_password,
    });

    const result = await userData.save();

    // jwt:-
    let access_token = await jwt.sign(
      { id: result._id },
      process.env.SECRET_ACCESS_KEY
    );

    return res
      .status(200)
      .json({ success: "true", message: result, access_token });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(500).json({
        success: "false",
        message: "Email already exists.",
      });
    }
    return res.status(500).json({ message: error.message });
  }
};

// !signin:-
const Signin = async (req, res) => {
  try {
    let { email, password } = req.body;
    const user = await SignUpData.findOne({ email: email });

    if (!user) {
      return res.status(403).json({
        success: "false",
        message: "Email not found.",
      });
    }

    // compare the password:-
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(403).json({
        success: "false",
        message: "Password is incorrect.",
      });
    }

    if (user && isMatch) {
      let access_token = await jwt.sign(
        { id: user._id },
        process.env.SECRET_ACCESS_KEY
      );
      return res.status(200).json({
        success: "true",
        message: user,
        access_token,
      });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ! change password:-
const ChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    // validate the password:-
    if (
      !passwordRegex.test(currentPassword) ||
      !passwordRegex.test(newPassword)
    ) {
      return res.status(403).json({
        error:
          "Password should be 6 to 20 characters long with a numeric, 1 lowercase and 1 uppercase letter",
      });
    }
    // find the user:-
    const user = await SignUpData.findById(req.user);
    bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      } else if (!isMatch) {
        return res.status(403).json({ error: "Current password is incorrect" });
      } else {
        bcrypt.hash(newPassword, 10, (err, hash) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          } else {
            user.password = hash;
            user.save();
            return res.status(200).json({ message: "Password changed" });
          }
        });
      }
    });
  } catch (error) {
    return res.status(200).json({ error: error.message });
  }
};

// ! updated profile image:-
const UpdateProfileImage = async (req, res) => {
  try {
    const { url } = req.body;
    const user = await SignUpData.findOneAndUpdate(
      { _id: req.user },
      { profile_img: url }
    );
    if (user) {
      return res.status(200).json({ user });
    } else {
      return res
        .status(403)
        .json({ error: "Data is not finding by the server" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! updated edit profile:-
const UpdateEditProfile = async (req, res) => {
  try {
    const bioLimit = 150;
    const { bio, social_links } = req.body;
    if (bio.length > bioLimit) {
      return res
        .status(403)
        .json({ error: `Bio should not be more than ${bioLimit} characters.` });
    }
    // validate the social links:-
    const socialLinksArr = Object.keys(social_links);
    for (let i = 0; i < socialLinksArr.length; i++) {
      if (social_links[socialLinksArr[i]]) {
        let hostname = new URL(social_links[socialLinksArr[i]]).hostname;
        if (
          !hostname.includes(`${socialLinksArr[i]}.com`) &&
          socialLinksArr[i] !== "website"
        ) {
          return res.status(403).json({
            error: `${socialLinksArr[i]} link is invalid. you must enter a full links`,
          });
        }
      }
    }
    // update the data:-
    const updateObj = {
      bio: bio,
      social_links,
    };
    const user = await SignUpData.findOneAndUpdate(
      { _id: req.user },
      updateObj,
      {
        runValidators: true,
      }
    );
    if (user) {
      return res.status(200).json({ user });
    } else {
      return res.status(403).json({ error: "Not update the profile" });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
};

// ! create-blog:-
const CreateBlog = async (req, res) => {
  try {
    let authorId = req.user;
    let { title, des, banner, tags, content, draft, id } = req.body;

    if (!title.length) {
      return res.status(403).json({ error: "You must provide the title" });
    }

    if (!draft) {
      if (!des.length || !des.length > 200) {
        return res.status(403).json({
          error: "You must provide the blog description under 200 characters.",
        });
      }

      if (!banner.length) {
        return res.status(403).json({
          error: "You must provide the blog banner to publish the blog.",
        });
      }

      if (!content.blocks.length) {
        return res.status(403).json({
          error: "You must provide the blog content to publish the blog.",
        });
      }

      if (!tags.length || tags.length > 10) {
        return res.status(403).json({
          error:
            "Provide tags in order to publish the blog, Maximum 10 tags allowed.",
        });
      }
    }

    // ! convert tag in lowercase:-
    tags = tags.map((tag) => tag.toLowerCase());

    let eightDigit = Math.floor(10000000 + Math.random() * 90000000).toString();

    let blog_id =
      id ||
      title
        .replace(/[^a-zA-Z0-9]/g, " ")
        .replace(/\s+/g, "-")
        .trim() + eightDigit;

    // ! update the data in the database:-
    if (id) {
      BlogData.findOneAndUpdate(
        { blog_id: id },
        { title, des, banner, content, tags, draft: draft ? draft : false }
      )
        .then(() => {
          return res.status(200).json({ id: blog_id });
        })
        .catch((error) => {
          return res.status(500).json({ error: error.message });
        });
    } else {
      // ! add the data to the database:-
      let blog = new BlogData({
        blog_id,
        title,
        des,
        banner,
        tags,
        content,
        author: authorId,
        draft: Boolean(draft),
      });

      blog.save().then((blog) => {
        let increment = draft ? 0 : 1;
        SignUpData.findOneAndUpdate(
          { _id: authorId },
          {
            $inc: { "account_info.total_posts": increment },
            $push: { blogs: blog._id },
          }
        )
          .then((users) => {
            return res.status(200).json({ id: blog.blog_id });
          })
          .catch((error) => {
            return res
              .status(500)
              .json({ error: "Faild to update total post number" });
          });
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! latest-blogs:-
const LatestBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number
    const maxLimit = parseInt(req.query.maxLimit) || 5; // Blogs per page
    const skip = (page - 1) * maxLimit; // Number of documents to skip
    const totalBlogs = await BlogData.countDocuments({ draft: false }); // Total number of blogs documents
    let hasMore = page * maxLimit < totalBlogs; // Check if there are more pages to load.

    let blogs = await BlogData.find({ draft: false })
      .populate("author", "profile_img fullname -_id")
      .sort({ publishedAt: -1 })
      .select("blog_id title des banner activity tags publishedAt -_id")
      .skip(skip)
      .limit(maxLimit);
    return res.status(200).json({ blogs, hasMore });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! treding-blogs:-
const TrendingBlogs = async (req, res) => {
  try {
    let blogs = await BlogData.find({ draft: false })
      .populate("author", "profile_img fullname -_id")
      .sort({
        "activity.total_read": -1,
        "activity.total_likes": -1,
        publishedAt: -1,
      })
      .select("blog_id title publishedAt -_id")
      .limit(5);
    return res.json({ trendingBlogs: blogs });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! search-blogs-through-tags:-
const SearchBlogs = async (req, res) => {
  try {
    const { tag } = req.body;
    const findQuery = { tags: tag, draft: false };
    const maxLimit = 5;
    const blogs = await BlogData.find(findQuery)
      .populate("author", "profile_img fullname -_id")
      .sort({ publishedAt: -1 })
      .select("blog_id title des banner tags activity publishedAt -_id")
      .limit(maxLimit);
    return res.status(200).json({ blogs });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! Search-blogs-through-inputData or query:-
const SearchQuery = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page
    const limit = parseInt(req.query.limit) || 5; // Blogs per page
    const searchQuery = req.query.search || " "; // Search query
    const skip = (page - 1) * limit; // Number of blogs to skip

    // Search filter
    const filter = searchQuery
      ? { title: { $regex: searchQuery, $options: "i" } } // Case-insensitive  search
      : {};

    const totalBlogs = await BlogData.countDocuments(filter);
    const hasMore = page * limit < totalBlogs;

    let blogs = await BlogData.find(filter, { draft: false })
      .populate("author", "profile_img fullname -_id")
      .sort({ publishedAt: -1 })
      .select("blog_id title des banner activity tags publishedAt -_id")
      .skip(skip)
      .limit(limit);
    return res.status(200).json({ blogs, hasMore });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! Search Users lists:-
const SearchUser = async (req, res) => {
  try {
    const searchQuery = req.query.search || " "; // Search query
    const filter = searchQuery
      ? { fullname: { $regex: searchQuery, $options: "i" } } // Case-insensitive  search
      : {};
    const users = await SignUpData.find(filter)
      .select("fullname profile_img email -_id")
      .limit(50);
    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! user profile :-
const UserProfile = async (req, res) => {
  try {
    const searchQuery = req.query.id || " "; // Search query
    const filter = searchQuery
      ? { fullname: { $regex: searchQuery, $options: "i" } } // Case-insensitive  search
      : {};
    const users = await SignUpData.findOne(filter).select(
      "-password -updatedAt -blogs"
    );
    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! edit-profile for settings:-
const EditProfileSettings = async (req, res) => {
  try {
    const { id } = req.body;
    const userProfile = await SignUpData.findOne({ _id: id }).select(
      "-password -updatedAt -blogs"
    );
    return res.status(200).json({ userProfile });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! user blogs:-
const UserBlogs = async (req, res) => {
  try {
    const name = req.query.id;
    const userProfile = await SignUpData.findOne({ fullname: name });
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = parseInt(req.query.limit) || 5; // Blogs per page
    const skip = (page - 1) * limit; // Number of documents to skip
    const totalBlogs = await BlogData.countDocuments();
    const hasMore = page * limit < totalBlogs;

    const userBlogs = await BlogData.find({
      author: userProfile._id,
      draft: false,
    })
      .populate("author", "profile_img fullname -_id")
      .sort({ publishedAt: -1 })
      .select("blog_id title des banner activity tags publishedAt -_id")
      .skip(skip)
      .limit(limit);
    return res.status(200).json({ userBlogs, hasMore, userProfile });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! get blog:-
const GetBlog = async (req, res) => {
  try {
    const { draft, mode } = req.body;
    let incrementValue = mode !== "edit" ? 1 : 0;
    let blog_id = req.query.id;
    const blog = await BlogData.findOneAndUpdate(
      { blog_id: blog_id },
      { $inc: { "activity.total_reads": incrementValue } }
    )
      .populate("author", "fullname profile_img")
      .select("blog_id title des content banner activity tags publishedAt");
    try {
      await SignUpData.findOneAndUpdate(
        {
          _id: blog.author._id,
        },
        { $inc: { "account_info.total_reads": incrementValue } }
      );
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
    if (blog.draft && !draft) {
      return res.status(500).json({ error: "You can not access draft blog" });
    }
    return res.status(200).json({ blog });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! similar blogs:-
const SimilarBlog = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page
    const limit = parseInt(req.query.limit) || 5; // Blogs per page
    const tagQuery = JSON.parse(req.query.tagList); // Search query
    const skip = (page - 1) * limit; // Number of blogs to skip

    const totalBlogs = await BlogData.countDocuments(tagQuery);
    const hasMore = page * limit < totalBlogs;

    const blogs = await BlogData.find({
      tags: { $in: tagQuery },
      draft: false,
    })
      .populate("author", "profile_img fullname -_id")
      .sort({ publishedAt: -1 })
      .select("blog_id title des banner activity tags publishedAt -_id")
      .skip(skip)
      .limit(limit);
    if (blogs.length > 0) {
      return res.status(200).json({ blogs, hasMore });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! liked blog:-
const LikedBlog = async (req, res) => {
  try {
    // from jwtVerify:-
    let user_id = req.user;
    let { _id, isLikedByUser } = req.body;
    let incrementValue = !isLikedByUser ? 1 : -1;
    let blog = await BlogData.findOneAndUpdate(
      { _id },
      { $inc: { "activity.total_likes": incrementValue } }
    );
    if (!isLikedByUser) {
      let like = new Notifications({
        type: "like",
        blog: _id,
        notification_for: blog.author,
        user: user_id,
      });
      const notification = await like.save();
      if (notification) {
        return res.status(200).json({ liked_by_user: true });
      }
    } else {
      Notifications.findOneAndDelete({
        type: "like",
        blog: _id,
        user: user_id,
      })
        .then(() => {
          return res.status(200).json({ liked_by_user: false });
        })
        .catch((error) => {
          return res.status(500).json({ error: error.message });
        });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! like information:-
const LikeInfomation = async (req, res) => {
  try {
    // from jwtVerify:-
    let user_id = req.user;
    const { _id } = req.body;
    const result = await Notifications.exists({
      type: "like",
      blog: _id,
      user: user_id,
    });
    return res.status(200).json({ result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! add comment in the database:-
const AddComment = async (req, res) => {
  try {
    // from jwtVerify:-
    let user_id = req.user;
    const { _id, comment, blog_author } = req.body;
    if (!comment.length) {
      return res.status(400).json({ error: "Please enter a comment..." });
    }
    // create comment document:-
    const commentObj = new Comments({
      blog_id: _id,
      blog_author,
      comment,
      commented_by: user_id,
    });
    commentObj.save().then((commentFile) => {
      const { comment, commentedAt, children } = commentFile;
      // blog data comments update:-
      BlogData.findOneAndUpdate(
        { _id },
        {
          $push: { comments: commentFile._id },
          $inc: { "activity.total_comments": 1 },
          "activity.total_parent_comments": 1,
        }
      ).then(() => {
        console.log("New Comment Created Successfully");
      });
      // notification data comments update:-
      const notificationObj = new Notifications({
        type: "comment",
        blog: _id,
        notification_for: blog_author,
        user: user_id,
        comment: commentFile._id,
      });
      notificationObj.save().then(() => {
        console.log("New Notification Created Successfully");
      });
      return res.status(200).json({
        comment,
        commentedAt,
        _id: commentFile._id,
        user_id,
        children,
      });
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! get comment data:-
const GetBlogCommentData = async (req, res) => {
  try {
    const { _id } = req.body;
    console.log(_id);
    const comments = await Comments.find({
      blog_id: _id,
      isReply: false,
    })
      .populate("commented_by", "fullname profile_img")
      .select("comment isReply commentedAt")
      .sort({ commentedAt: -1 });
    return res.status(200).json({ comments });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! get the comment id and store reply:-
const GetAddReply = async (req, res) => {
  try {
    // from jwtVerify:-
    let user_id = req.user;
    const { _id, replyComment, blog_author } = req.body;
    if (!replyComment.length) {
      return res.status(400).json({ error: "Please enter a comment..." });
    }
    const commentObj = new Comments({
      blog_id: _id,
      blog_author: blog_author,
      comment: replyComment,
      commented_by: user_id,
      parent: _id,
    });
    commentObj.save().then(async (commentFile) => {
      const { comment, commentedAt, children } = commentFile;
      // blog data comments update:-
      BlogData.findOneAndUpdate(
        { _id },
        {
          $push: { comments: commentFile._id },
          $inc: { "activity.total_comments": 1 },
          "activity.total_parent_comments": 0,
        }
      ).then(() => {
        console.log("New Comment Created Successfully");
      });
      // notification data comments update:-
      let notificationObj = new Notifications({
        type: "reply",
        blog: _id,
        notification_for: blog_author,
        user: user_id,
        comment: commentFile._id,
        replied_on_comment: _id,
      });
      await Comments.findOneAndUpdate(
        {
          _id,
        },
        { $push: { children: commentFile._id } }
      ).then((replyComment) => {
        console.log(replyComment);
        notificationObj.notification_for = replyComment.commented_by;
      });
      notificationObj.save().then(() => {
        console.log("New Notification Created Successfully");
      });
      return res.status(200).json({
        comment,
        commentedAt,
        _id: commentFile._id,
        user_id,
        children,
      });
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! get new notifications:-
const GetNewNotifications = async (req, res) => {
  try {
    const user_id = req.user;
    const notifications = await Notifications.exists({
      notification_for: user_id,
      seen: false,
      user: { $ne: user_id },
    });
    if (notifications) {
      return res.status(200).json({ new_notification_available: true });
    } else {
      return res.status(200).json({ new_notification_available: false });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! get and update notifications:-
const NotificationsData = async (req, res) => {
  try {
    const user_id = req.user;
    const { page, filter, maxLimit } = req.body;
    let notifications;
    if (filter === "like" || filter === "comment" || filter === "reply") {
      notifications = await Notifications.find({
        type: filter,
        user: { $ne: user_id },
      })
        .populate("comment", "comment commentedAt")
        .populate("user", "fullname profile_img")
        .populate("blog", "title banner blog_id")
        .sort({ createdAt: -1 });
    } else {
      notifications = await Notifications.find({
        user: { $ne: user_id },
      })
        .populate("comment", "comment commentedAt")
        .populate("user", "fullname profile_img")
        .populate("blog", "title banner blog_id")
        .sort({ createdAt: -1 });
    }
    const totalDocs = notifications.length;
    const hasMore = page * maxLimit < totalDocs;
    return res.status(200).json({ notifications, hasMore });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ! user-written-blog data:-
const UserWrittenBlogs = async (req, res) => {
  try {
    const user_id = req.user;
    const { page, draft, maxLimit, query } = req.body;
    const userBlogs = await BlogData.find({ author: user_id, draft })
      .sort({ publishedAt: -1 })
      .select("blog_id title des draft banner activity publishedAt -_id");
    return res.status(200).json({ userBlogs });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

//! detete blog:-
const DeleteBlog = async (req, res) => {
  try {
    const user_id = req.user;
    const { blog_id } = req.body;
    const blog = await BlogData.findOneAndDelete({ blog_id });
    if (blog) {
      Notifications.deleteMany({ blog: blog._id }).then(() => {
        console.log("Notifications Deleted Successfully");
      });
      Comments.deleteMany({ blog_id: blog._id }).then(() => {
        console.log("Comments Deleted Successfully");
      });
      SignUpData.findOneAndUpdate(
        { _id: user_id },
        { $inc: { "account_info.total_posts": -1 } },
        { new: true }
      ).then(() => {
        console.log("Posts Updated Successfully");
      });
      return res.status(200).json({ message: "Blog Deleted Successfully" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// const UploadUrl = async (req, res) => {
//   try {
//     const url = await GenerateUploadUrl();
//     console.log(url);
//     if (url) {
//       return res.status(200).json({ success: "true", message: url });
//     }
//   } catch (error) {
//     return res.status(500).json({ message: error.message });
//   }
// };

module.exports = {
  Signup,
  Signin,
  ChangePassword,
  UpdateProfileImage,
  UpdateEditProfile,
  CreateBlog,
  LatestBlogs,
  TrendingBlogs,
  SearchBlogs,
  SearchQuery,
  SearchUser,
  UserProfile,
  EditProfileSettings,
  UserBlogs,
  GetBlog,
  SimilarBlog,
  LikedBlog,
  LikeInfomation,
  AddComment,
  GetBlogCommentData,
  GetAddReply,
  GetNewNotifications,
  NotificationsData,
  UserWrittenBlogs,
  DeleteBlog,
};
