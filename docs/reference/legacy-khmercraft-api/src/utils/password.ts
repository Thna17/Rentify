import bcrypt from 'bcryptjs';

const PASSWORD_ROUNDS = 12;

export const hashPassword = (password: string) =>
  bcrypt.hash(password, PASSWORD_ROUNDS);

export const verifyPassword = (password: string, passwordHash: string) =>
  bcrypt.compare(password, passwordHash);

let dummyHash: Promise<string> | null = null;
const getDummyHash = () => {
  dummyHash ??= bcrypt.hash('khmercraft-timing-placeholder', PASSWORD_ROUNDS);
  return dummyHash;
};

/**
 * Verifies a password, spending the same time whether or not the account
 * exists.
 *
 * A plain `!user || !(await verify(...))` short-circuits: an unknown email
 * answers in about a millisecond while a known one takes as long as bcrypt
 * needs. That gap is easily measurable over the network and turns login into
 * an account-enumeration oracle. Hashing against a throwaway hash keeps the
 * work — and therefore the response time — identical.
 */
export const verifyPasswordConstantTime = async (
  password: string,
  passwordHash?: string | null,
) => {
  const comparisonHash = passwordHash ?? (await getDummyHash());
  const matches = await bcrypt.compare(password, comparisonHash);
  return passwordHash ? matches : false;
};
