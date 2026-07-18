# Tattoo
A voting site for my next tattoo

## How it works
A static page (`index.html`) backed by a free Supabase project for shared,
real-time votes. No login — anyone with the link can vote once (changeable
any time) and add their own option.

## One-time setup

1. **Create a Supabase project** at supabase.com (free tier).
2. **Run the schema**: open the SQL Editor in your Supabase dashboard, paste
   in the contents of `supabase-schema.sql`, and run it. This creates the
   tables, security policies, and seeds the 3 placeholder options.
3. **Get your keys**: Project Settings > API. Copy the Project URL and the
   `anon public` key.
4. **Fill in `config.js`** with those two values.
5. Commit and push.

## Enable GitHub Pages

Repo Settings > Pages > Source: Deploy from a branch. Pick this branch
(`tattoo-voting`, or `main` after merging) and folder `/ (root)`. Your friends
can then vote at the URL GitHub gives you.

## Updating the options later
Easiest: Supabase dashboard > Table Editor > `options` table — edit or delete
rows directly. Votes tied to a deleted option are removed automatically.
