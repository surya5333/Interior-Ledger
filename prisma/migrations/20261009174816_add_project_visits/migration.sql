-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "visit_name" TEXT NOT NULL,
    "description" TEXT,
    "sequence_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visit_project_id_date_idx" ON "Visit"("project_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_project_id_sequence_number_key" ON "Visit"("project_id", "sequence_number");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
