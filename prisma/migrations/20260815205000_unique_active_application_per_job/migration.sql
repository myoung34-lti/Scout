-- A candidate can be in more than one job's process at once, but never in
-- the same job's process twice simultaneously. Enforce it at the database
-- level as a backstop to the application-level check in addCandidateToJob.
-- Hired/Rejected applications are excluded so a candidate can always be
-- re-added to a job once their prior attempt there has concluded.

CREATE UNIQUE INDEX "Application_candidateId_jobId_active_unique"
ON "Application" ("candidateId", "jobId")
WHERE stage NOT IN ('HIRED', 'REJECTED');
