/**
 * Schema validation tests using Prisma's DMMF (Data Model Meta Format).
 *
 * These tests bypass the Prisma mock (from setup.js) to read the real
 * generated Prisma schema metadata. The mock is restored after import.
 */

const realPrisma = jest.requireActual('@prisma/client');
const { Prisma } = realPrisma;

describe('Database Schema', () => {
  test('User model has required fields', () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'User');
    const fields = model.fields;
    const fieldNames = fields.map(f => f.name);
    expect(fieldNames).toContain('id');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('passwordHash');
    expect(fields.find(f => f.name === 'email').isUnique).toBe(true);
  });

  test('Camera model has expected relations', () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'Camera');
    const relationFields = model.fields.filter(f => f.relationName);
    expect(relationFields.some(f => f.name === 'user')).toBe(true);
    expect(relationFields.some(f => f.name === 'recordings')).toBe(true);
    expect(relationFields.some(f => f.name === 'alerts')).toBe(true);
  });

  test('Recording model has foreign key to Camera', () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'Recording');
    const cameraField = model.fields.find(f => f.name === 'cameraId');
    expect(cameraField).toBeDefined();
    expect(cameraField.isRequired).toBe(true);
  });

  test('Subscription.userId is unique', () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'Subscription');
    const userIdField = model.fields.find(f => f.name === 'userId');
    expect(userIdField.isUnique).toBe(true);
  });
});
