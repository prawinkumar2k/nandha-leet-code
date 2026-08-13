# LEO - Student Performance Dashboard 🏆

Welcome to the **LEO**, developed natively by **Prawinkumar.N**.
This software tracks student performance across LeetCode, calculates their latest stats dynamically using a pure offline local SQLite database, and supports batch parsing strictly by importing your daily collegiate Excel documents!

## How to use the Application

Because this application contains a full Chrome Embedded Framework (via Electron), the compiled `.zip` file is **~121 MB**, which exceeds standard GitHub limits for source code (max 100 MB).

As a result, you will find the finished and ready-to-use software directly on your own computer in this folder:
**`C:\Users\Admin\Downloads\leet code\release\LEO.zip`**

### Steps to Release Online:
If you want to host the `.zip` file on this GitHub repository so your friends or staff can download it, you just need to upload it to the **Releases** tab:
1. Look at the right sidebar of this GitHub page and click **"Releases"** (or "Create a new release").
2. Set the tag to `v1.0.0`.
3. Set the release title to **"LEO App - First Release"**.
4. **Drag and drop** your `LEO.zip` file directly from your `release/` folder into the attachment box.
5. Click **Publish release**.

## Developer Instructions

If you want to build or modify LEO further:
1. `npm install` inside the root to get electron builder.
2. `cd frontend && npm install` to install React bindings.
3. Use `npm run dev` to start a hot-reloading development server.
4. Use `npm run build` or `npm run pack` to compile exactly as seen in the `release/` folder.

--
*Built with ❤️ by Prawinkumar.N*
