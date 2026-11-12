# Your personal storytelling website

A responsive, personal-branded literary website where **you can draft and publish stories**, and **readers can like and comment**. Built with plain HTML, CSS, JavaScript, GitHub Pages and Supabase. No npm, Node.js or build process needed.

## What's included

- Editorial homepage opening with the latest story, followed by recent writing
- Searchable story archive with exactly two filters: **Short Stories** and **Novellas**
- Individual story pages, comfortable typography, estimated read times and sharing
- Email-link reader accounts for likes and comments
- One like per signed-in account per story, with unlike support
- Comments held for your approval before appearing publicly
- Restricted writer dashboard to create, edit, publish, unpublish and delete stories
- Live Markdown preview in the writer dashboard
- Mobile-friendly design and accessible form labels
- A clearly labeled, *non-live* preview with three original fictional examples (two short stories and a novella excerpt) before Supabase is configured

**Important:** The included example stories are fictional placeholder content, not your published work. When Supabase is connected, the placeholders disappear and only your database's published stories are displayed. The preview mode does not store real likes or comments.

## 1. Personalize it

Open `site-config.js` in a text editor. The site is branded as **A. M. Khan** by default. To change it, edit:

- `name` (shown in the logo and footer)
- `description` (used for search metadata; the old hero and About page have been removed)

Optionally edit `styles.css` at the top to change the brand palette (`--accent`, `--paper`, etc.).

## 2. Preview on your own computer

For a **one-click design preview**, double-click `preview.html`. It contains sample stories you can browse, with likes and comments disabled.

To run the **full website source** locally (required when you want live Supabase features), start a simple web server from this folder:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000` to see the preview. Or publish the static folder to GitHub Pages (step 7) to view the preview online.

Do not expect reader interactions to be live until you complete the Supabase setup.

## 3. Create a Supabase project

Go to https://supabase.com/ and create a project. In **SQL Editor**, paste and run the entire `schema.sql` file. This defines the stories, likes, comments, and admin-access tables and their row-level security policies.

Go to **Project Settings > API Keys** and copy the project URL and its **publishable** key (or legacy **anon** key). Supabase's dashboard navigation can change; the important thing is to use the public, browser-safe key.

Set `supabaseUrl` and `supabaseAnonKey` in `site-config.js` to those two values. Do **NOT** use a secret or service_role key in frontend code, GitHub, or this file.

## 4. Configure reader sign-in (essential for public launch)

This starter uses **email magic links** so readers don't need to remember passwords. In Supabase:

1. Keep the Email Auth provider enabled under **Authentication**.
2. Under **Authentication > URL Configuration**, set the **Site URL** to your deployed homepage (for example, `https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPO/`). Add the deployed site's URL with an appropriate path wildcard (for example, `https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPO/**`) to **Redirect URLs**. For local testing, also allow `http://localhost:8000/**`.
3. **Before public launch, set up custom SMTP** in Supabase Authentication's email/SMTP settings, using a delivery service such as Resend, Brevo or Postmark. Supabase's default email sender is for testing with project-team emails only, and its limits are too restrictive for public readers. You may need to verify a sending domain with your SMTP provider.
4. Check your Email template uses a Magic Link. Supabase's default `signInWithOtp` email template sends a magic link if the template contains `{{ .ConfirmationURL }}`.
5. Configure Auth CAPTCHA/rate limits in Supabase before promoting the site widely; add bot protection and abuse monitoring if traffic increases.

See Supabase's official guides:
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/redirect-urls

## 5. Make yourself the only writer/admin

1. Visit `https://YOUR-SITE/admin.html` (or local `/admin.html`).
2. Request a sign-in link at your own email and click the link in that inbox.
3. In Supabase **Authentication > Users**, copy the UUID of the newly created user.
4. Run this SQL in Supabase SQL Editor, replacing the placeholder UUID:

```sql
insert into public.admins (user_id)
values ('YOUR-USER-UUID-HERE');
```

5. Refresh `/admin.html`. You now have access to the writer's desk. **Do not add reader UUIDs** to the `admins` table. No one else can publish/edit stories unless you explicitly grant that access in SQL.

## 6. Publish the first story

Open `/admin.html`, choose **Write / Edit**, enter a title, excerpt, choose **Short Stories** or **Novellas**, and add the body. You can use Markdown: `## Heading`, `**bold**`, `*italic*`, `> quotation`, `- list item`. Select **Published** and save. The story appears instantly on the homepage and in the archive.

To add a cover, supply a full `https://` image URL for an image that you own or are licensed to publish. Without it, an abstract cover displays. If you upload images to a public storage service, keep the relevant image files available.

Read a story, sign in as a separate reader (different email), leave a comment, then approve it in the **Review comments** tab. Comments remain hidden to other readers until approval. Readers can see their own pending comments.

## 7. Host the site on GitHub Pages

1. Create a **public** GitHub repository for this website, such as `my-stories`.
2. Upload the files **at the repository root** (not inside the outer `storytelling_site` folder). Keep `.nojekyll` in the repository. You can omit `preview.html` from the public repository after reviewing it.
3. Go to **Settings > Pages > Build and deployment**, choose **Deploy from a branch**, and select `main` and `/ (root)`.
4. Your site will appear at `https://YOUR-GITHUB-USERNAME.github.io/my-stories/` after GitHub Pages deploys it.
5. Return to Supabase Auth settings to configure the live Site URL and redirect URL.
6. When you're ready, buy and connect a personal domain such as `yourname.com`. GitHub Pages supports custom domains. Update Supabase redirect URLs for the custom domain too.

GitHub Pages docs: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

**Site URLs:** Keep relative links (`./`), which work for both root domains and GitHub Pages project subpaths.

## Security and operational notes

- The Supabase publishable/anon key is intended for use in browsers. **Never expose a service_role/secret key.**
- The SQL applies RLS: visitors only see published stories and approved comments, readers can only create their own likes and pending comments, and only approved admins can edit stories or moderate comments.
- Reader accounts are required to like/comment, reducing casual anonymous spam. Sign-in does **not** prevent all abuse. Consider additional rate limits, CAPTCHA and moderation tooling for a higher-volume launch.
- The public like count comes from a restricted SQL function so the site doesn't expose a public list of user account IDs.
- Comments are displayed as escaped text, and the basic Markdown renderer escapes raw HTML to prevent script injection.
- Your posts/comments/likes live in your Supabase database — **not in the GitHub repository**. Back up your data periodically, especially on the free plan.
- Search and category filtering are client-side and ideal for a small writer's archive. Very large story libraries will eventually need server-side pagination/search.
- SEO: this starter is JavaScript-rendered. For strong Google indexing and social share cards, a later version should pre-render pages or migrate to Astro/Next.js. Basic metadata is present, but a static-site frontend won't give every individual story its own server-rendered metadata.
- These files are a functional starter but have not been tested with your actual Supabase project or deployed under your domain. Verify all actions (publish/unpublish, sign-in, like/unlike, moderation, reload) before going live.

## File guide

| File | What it does |
|---|---|
| `preview.html` | Standalone offline design preview with sample content (not for live publishing) |
| `index.html` | Site shell/navigation/footer |
| `app.js` | Home, library, story reader, likes and comments |
| `admin.html` | Writer desk shell |
| `admin.js` | Editor, drafts, publishing and moderation |
| `styles.css` | All colors, typography and responsive styling |
| `site-config.js` | Personal brand text and Supabase configuration |
| `supabase.js` | Browser database connection |
| `utils.js` | Dates, Markdown rendering, escaping and helpers |
| `schema.sql` | Database tables, policies and helper functions |
| `.nojekyll` | Tells GitHub Pages to serve files as uploaded |

## Future upgrades

An author headshot, your own domain, an email newsletter, story series/chapters, reader profiles, comment replies, a rich-text editor, analytics and RSS. These are intentionally outside the current MVP.


## Story categories

The public archive intentionally offers **two filter buttons only**: **Short Stories** and **Novellas**. When the Stories page first opens, **Short Stories** is selected. Selecting **Novellas** shows just novellas; search applies within the selected category. The public homepage and archive show only these two categories. The writer dashboard uses a dropdown limited to these two choices.

If you previously published items under *Reflections*, *Personal Essays*, or another category, **those records are not deleted**. They are hidden from public display until you edit their category in the writer dashboard. When editing a legacy story in the dashboard, select the correct new category before saving.

If you already ran an earlier version of `schema.sql` in Supabase, **do not rerun the full schema**: just upload the updated frontend files, since the existing database allows the two new category values. For a brand-new Supabase project, use the included `schema.sql`.

To update an existing GitHub Pages site, replace `app.js`, `admin.js`, `site-config.js`, `index.html`, and `preview.html`; the included `schema.sql` is for new database setups only. Existing Supabase configuration values in `site-config.js` should be preserved if you have already added them.
