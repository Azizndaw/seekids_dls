-- Restaurer les 2 émargements TS2 de M. NDAW (Informatique)
INSERT OR IGNORE INTO Emargement (id, createdAt, classeId, disciplineId, professeurId, debut, fin, seanceCounter, content, additionalInfo, schoolId)
VALUES
  ('e9883b02-1ec8-4468-8c7c-fbcd6c962535', '2026-10-18 13:39:55', 'b22d366d-78c1-4bba-b591-f08c34ad48ce', '6793dee8-4253-4bdd-b403-488f327565d3', 'd8a08b24-1da8-4583-847b-547588c3c1ed', '2026-10-16T08:00', '2026-10-16T08:40', 1, 'prise de contact', NULL, '444b49f3-e9bc-4041-ad29-2fd622d31ea1'),
  ('3d3fd833-b86d-47d0-8c94-3953bc01a6bc', '2026-10-31 04:09:52', 'b22d366d-78c1-4bba-b591-f08c34ad48ce', '6793dee8-4253-4bdd-b403-488f327565d3', 'd8a08b24-1da8-4583-847b-547588c3c1ed', '2026-10-22T09:50', '2026-10-22T10:30', 1, 'Addition et multiplication binaire', NULL, '444b49f3-e9bc-4041-ad29-2fd622d31ea1');

INSERT OR IGNORE INTO EmargementClasse (emargementId, classeId)
VALUES
  ('e9883b02-1ec8-4468-8c7c-fbcd6c962535', 'b22d366d-78c1-4bba-b591-f08c34ad48ce'),
  ('3d3fd833-b86d-47d0-8c94-3953bc01a6bc', 'b22d366d-78c1-4bba-b591-f08c34ad48ce');
