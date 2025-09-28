---
description: Create or update the feature specification from a natural language feature description.
---

The user input to you can be provided directly by the agent or as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

game setup
Create a multi-user trivia application.
The game will be played in a single room on a specified date & time as a "game" or "game event", usually in a pub or a restaurant or similar venue. Usually the venue will have one or more TV screens to display the questions and scores, and the players will use their mobile phones to view and answer the questions in real time as the host advances through the game.
The application should have two types of users: "host" and "player". The host will control the game, and the players will join the game using a code provided by the host or players can scan a QR code displayed on the TV screens.
The host will set up the game prior to the event:

- Create a game event with a name, date and time (optional), venue/location (optional)
- select the number of rounds for the game (e.g. 3 rounds)
- select the number of questions per round (e.g. 5 questions per round)
- select the categories for each round (each round will have questions selected from one or more categories)
- there are 10 main categories:
  | Arts & Literature |
  | Entertainment |
  | Food and Drink |
  | General Knowledge |
  | Geography |
  | History |
  | Pop Culture |
  | Science |
  | Sports |
  | Technology |
- there is an existing table in the database named "questions" with over 61k questions:
  Table "public.questions"
  Column | Type | Collation | Nullable | Default
  ------------+--------------------------+-----------+----------+---------
  id | uuid | | not null |
  category | text | | not null |
  question | text | | not null |
  a | text | | |
  b | text | | |
  c | text | | |
  d | text | | |
  metadata | jsonb | | |
  created_at | timestamp with time zone | | |
  updated_at | timestamp with time zone | | |
  Indexes:
  "questions_pkey" PRIMARY KEY, btree (id)
  "idx_questions_category" btree (category)
  "idx_questions_created_at" btree (created_at DESC)
  Policies:
  POLICY "Authenticated users can read questions" FOR SELECT
  USING ((auth.role() = 'authenticated'::text))
  POLICY "Authenticated users can view questions" FOR SELECT
  TO authenticated
  USING (true)
  NOTE: the correct answer is stored in the "a" column, and columns "b", "c", and "d" are the incorrect answers.
- random questions will be selected from the database for each round based on the selected categories and number of questions per round
- the host can preview the selected questions and answers for each round and make changes if necessary (e.g. remove a question, change the order of answers, etc.)
- the host can save the game setup and start the game at the specified date & time
- once the game is started, the host can control the game flow (e.g. advance to the next question, show the correct answer, show the scores, etc.)
- the players can join the game using a code provided by the host or by scanning a QR code displayed on the TV screens
- the players can view the questions and answers on their mobile phones in real time as the host advances through the game
- the players can select their answers and submit them
- players can create a team OR join an existing team (teams can have multiple players)
- only one answer can be selected per team, so if a team has multiple players, they must agree on the answer before submitting it (once the first answer is submitted for a question for a team, that answer is locked in and cannot be changed)
- the application will keep track of each submitted answer for each team and calculate the scores based on the number of correct answers
- at the end of the each round and at the end of the game, the application will display the final scores for all the teams, showing the winning team and standings
- game play is all controlled by the host's browser, and the players' browsers are read-only (they can only view the questions and answers and submit their answers)
- transmission to the TV screens and to the players's browsers should be done using supabase realtime broadcast channels
- scores and standings at the end of each round and at the end of the game should be displayed in a visually appealing way, using charts or graphs if possible, and transmitted also using supabase realtime broadcast channels

The text the user typed after `/specify` in the triggering message **is** the feature description. Assume you always have it available in this conversation even if `$ARGUMENTS` appears literally below. Do not ask the user to repeat it unless they provided an empty command.

Given that feature description, do this:

1. Run the script `.specify/scripts/bash/create-new-feature.sh --json "$ARGUMENTS"` from repo root and parse its JSON output for BRANCH_NAME and SPEC_FILE. All file paths must be absolute.
   **IMPORTANT** You must only ever run this script once. The JSON is provided in the terminal as output - always refer to it to get the actual content you're looking for.
2. Load `.specify/templates/spec-template.md` to understand required sections.
3. Write the specification to SPEC_FILE using the template structure, replacing placeholders with concrete details derived from the feature description (arguments) while preserving section order and headings.
4. Report completion with branch name, spec file path, and readiness for the next phase.

Note: The script creates and checks out the new branch and initializes the spec file before writing.
