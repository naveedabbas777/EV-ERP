-- Seed the Pakistan EV dealer demo organization and key regional data.
INSERT INTO Organization (id, name, slug, status, settings, createdAt, updatedAt)
SELECT UUID(), 'Pakistan EV Dealer Group', 'pakistan-ev-dealer-group', 'active',
       JSON_OBJECT('country', 'Pakistan', 'theme', 'dark'),
       NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM Organization WHERE slug = 'pakistan-ev-dealer-group'
);

INSERT INTO Region (id, organizationId, name, code, createdAt, updatedAt)
SELECT UUID(), o.id, 'Karachi', 'KHI', NOW(), NOW()
FROM Organization o
WHERE o.slug = 'pakistan-ev-dealer-group'
  AND NOT EXISTS (
    SELECT 1 FROM Region r WHERE r.organizationId = o.id AND r.code = 'KHI'
  );

INSERT INTO Region (id, organizationId, name, code, createdAt, updatedAt)
SELECT UUID(), o.id, 'Lahore', 'LHR', NOW(), NOW()
FROM Organization o
WHERE o.slug = 'pakistan-ev-dealer-group'
  AND NOT EXISTS (
    SELECT 1 FROM Region r WHERE r.organizationId = o.id AND r.code = 'LHR'
  );

INSERT INTO Region (id, organizationId, name, code, createdAt, updatedAt)
SELECT UUID(), o.id, 'Islamabad', 'ISB', NOW(), NOW()
FROM Organization o
WHERE o.slug = 'pakistan-ev-dealer-group'
  AND NOT EXISTS (
    SELECT 1 FROM Region r WHERE r.organizationId = o.id AND r.code = 'ISB'
  );

INSERT INTO Region (id, organizationId, name, code, createdAt, updatedAt)
SELECT UUID(), o.id, 'Multan', 'MUX', NOW(), NOW()
FROM Organization o
WHERE o.slug = 'pakistan-ev-dealer-group'
  AND NOT EXISTS (
    SELECT 1 FROM Region r WHERE r.organizationId = o.id AND r.code = 'MUX'
  );
