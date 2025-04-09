DELETE FROM alert;
DELETE FROM sqlite_sequence WHERE name='alert';

DELETE FROM alert
WHERE id IN (
    SELECT id FROM alert
    ORDER BY id DESC
    LIMIT 4
);