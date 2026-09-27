-- Default genres. Instances can add or rename genres with plain SQL.
INSERT INTO "genres" ("slug", "name", "position") VALUES
  ('fiction', 'Fiction', 1),
  ('mystery', 'Mystery', 2),
  ('romance', 'Romance', 3),
  ('fantasy', 'Fantasy', 4),
  ('sci-fi', 'Sci-Fi', 5),
  ('horror', 'Horror', 6),
  ('thriller', 'Thriller', 7),
  ('historical', 'Historical', 8),
  ('literary', 'Literary', 9),
  ('young-adult', 'Young Adult', 10),
  ('humor', 'Humor', 11),
  ('poetry', 'Poetry', 12),
  ('short-story', 'Short Story', 13),
  ('non-fiction', 'Non-fiction', 14)
ON CONFLICT ("slug") DO NOTHING;
