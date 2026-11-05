-- 1. Supprimer les 3 doubles émargements de TS2 (en gardant ceux de TL2)
DELETE FROM EmargementClasse WHERE emargementId IN (
  'e9883b02-1ec8-4468-8c7c-fbcd6c962535',
  '3d3fd833-b86d-47d0-8c94-3953bc01a6bc',
  'ff0bbe50-7ed1-49e4-9de1-18b85e1e945f'
);

DELETE FROM Emargement WHERE id IN (
  'e9883b02-1ec8-4468-8c7c-fbcd6c962535',
  '3d3fd833-b86d-47d0-8c94-3953bc01a6bc',
  'ff0bbe50-7ed1-49e4-9de1-18b85e1e945f'
);

-- 2. Basculer l'émargement commun isolé d'EPS (M. FAYE EPS, 2026-10-15 14h00-15h20) de TS2 vers TL2
UPDATE Emargement
SET classeId = 'd581327b-6148-4aa0-8ec5-be5aac783ac0'
WHERE id = 'd3fd6ab9-7d90-424c-825d-fb81fc7df45c';

UPDATE EmargementClasse
SET classeId = 'd581327b-6148-4aa0-8ec5-be5aac783ac0'
WHERE emargementId = 'd3fd6ab9-7d90-424c-825d-fb81fc7df45c'
  AND classeId = 'b22d366d-78c1-4bba-b591-f08c34ad48ce';

-- 3. Supprimer les 10 créneaux de cours en doublon sur TS2 (qui sont en commun avec TL2)
DELETE FROM Cours WHERE id IN (
  '9547da5d-e7a9-448c-a64c-144179352596', -- Jeudi 08h00 - 09h30 | Histoire-Géographie | M. NGOM (HG)
  'a817f720-9bf7-4c68-96fb-648e50eeed37', -- Jeudi 09h 50 - 10h 30 | Initiation à l'entrepreneuriat | M. FAYE & SYLLA
  'cb648ff4-b8d8-4201-8b80-f145b355b94a', -- Jeudi 11h30 - 13h00 | Histoire-Géographie | M. NGOM (HG)
  'a6b470bf-7b1e-4de7-b134-fefc510588c3', -- Mardi 09h50 - 11h20 | Anglais | M. GNING (Anglais)
  'ab07563f-48eb-42a2-911f-f3049bacd54d', -- Mardi 14h00 - 15h20 | Histoire-Géographie | M. NGOM (HG)
  'f65ddb3d-1a4c-492f-a132-b73212c8f6a0', -- Mercredi 09h50 - 11h20 | Français | M.T. FALL
  '522612ca-e9c5-459f-b038-ea062f944012', -- Mercredi 14h00 - 15h20 | Français | M.T. FALL
  'c7002209-a628-4cf4-92b9-1f3fce64b2e2', -- Vendredi 08h00 - 09h30 | Français | M.T. FALL
  'd3674315-16a7-4a98-8839-0599ad0f26c0', -- Vendredi 09h50 - 11h20 | EPS | M. FAYE EPS
  '0e11351c-58f4-4612-941b-4721a798ebb6'  -- Vendredi 11h30 - 12h10 | Anglais | M. GNING (Anglais)
);
