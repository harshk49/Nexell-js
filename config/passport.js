import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/User.js";
import logger from "../utils/logger.js";

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    logger.error(`Error deserializing user: ${err.message}`);
    done(err, null);
  }
});

// Get OAuth callback URL based on environment
const getCallbackUrl = (provider) => {
  const baseUrl = process.env.API_BASE_URL || "https://nexell-js.onrender.com";
  return `${baseUrl}/api/auth/${provider}/callback`;
};

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: getCallbackUrl("google"),
      scope: ["profile", "email"],
      state: true, // Enable state parameter for CSRF protection
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        logger.info(
          `Google OAuth login attempt for: ${profile.emails[0].value}`
        );

        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // Update last login time
          user.lastLogin = new Date();
          // Record login history
          user.loginHistory.push({
            date: new Date(),
            provider: "google",
          });
          await user.save();

          logger.info(`Google user logged in: ${user.email}`);
          return done(null, user);
        }

        // Check if user exists with the same email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Link this Google account to the existing user
          user.googleId = profile.id;
          if (!user.firstName) {
            user.firstName =
              profile.name.givenName || profile.displayName.split(" ")[0];
          }
          if (!user.lastName && profile.name.familyName) {
            user.lastName = profile.name.familyName;
          }
          if (!user.avatar && profile.photos && profile.photos.length > 0) {
            user.avatar = profile.photos[0].value;
          }

          // Update last login time
          user.lastLogin = new Date();
          // Record login history
          user.loginHistory.push({
            date: new Date(),
            provider: "google",
          });

          await user.save();
          logger.info(`Linked Google account to existing user: ${user.email}`);
          return done(null, user);
        }

        // Create a new user
        const newUser = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          username:
            profile.emails[0].value.split("@")[0] +
            "-" +
            Math.floor(Math.random() * 10000),
          firstName:
            profile.name.givenName || profile.displayName.split(" ")[0],
          lastName: profile.name.familyName || "",
          avatar:
            profile.photos && profile.photos.length > 0
              ? profile.photos[0].value
              : "",
          isVerified: true, // Google accounts are pre-verified
          lastLogin: new Date(),
          loginHistory: [
            {
              date: new Date(),
              provider: "google",
            },
          ],
        });

        await newUser.save();
        logger.info(`New user created via Google OAuth: ${newUser.email}`);
        return done(null, newUser);
      } catch (err) {
        logger.error(`Google OAuth error: ${err.message}`);
        return done(err, null);
      }
    }
  )
);

// GitHub OAuth Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: getCallbackUrl("github"),
      scope: ["user:email"],
      state: true, // Enable state parameter for CSRF protection
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this GitHub ID
        let user = await User.findOne({ githubId: profile.id });

        if (user) {
          // Update last login time
          user.lastLogin = new Date();
          // Record login history
          user.loginHistory.push({
            date: new Date(),
            provider: "github",
          });
          await user.save();

          logger.info(`GitHub user logged in: ${user.email}`);
          return done(null, user);
        }

        // Get primary email from GitHub
        const primaryEmail =
          profile.emails && profile.emails.length > 0
            ? profile.emails[0].value
            : `${profile.username}@github.com`;

        // Check if user exists with the same email
        user = await User.findOne({ email: primaryEmail });

        if (user) {
          // Link this GitHub account to the existing user
          user.githubId = profile.id;
          if (!user.firstName) {
            user.firstName =
              profile.displayName.split(" ")[0] || profile.username;
          }
          if (!user.avatar && profile.photos && profile.photos.length > 0) {
            user.avatar = profile.photos[0].value;
          }

          // Update last login time
          user.lastLogin = new Date();
          // Record login history
          user.loginHistory.push({
            date: new Date(),
            provider: "github",
          });

          await user.save();
          logger.info(`Linked GitHub account to existing user: ${user.email}`);
          return done(null, user);
        }

        // Create a new user
        const nameParts = profile.displayName
          ? profile.displayName.split(" ")
          : [profile.username, ""];
        const newUser = new User({
          githubId: profile.id,
          email: primaryEmail,
          username: profile.username + "-" + Math.floor(Math.random() * 10000),
          firstName: nameParts[0],
          lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "",
          avatar:
            profile.photos && profile.photos.length > 0
              ? profile.photos[0].value
              : "",
          isVerified: true, // GitHub accounts are pre-verified
          lastLogin: new Date(),
          loginHistory: [
            {
              date: new Date(),
              provider: "github",
            },
          ],
        });

        await newUser.save();
        logger.info(`New user created via GitHub OAuth: ${newUser.email}`);
        return done(null, newUser);
      } catch (err) {
        logger.error(`GitHub OAuth error: ${err.message}`);
        return done(err, null);
      }
    }
  )
);

export default passport;
