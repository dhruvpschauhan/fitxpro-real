import client from './client'

// ── Dashboard ───────────────────────────────────────────
export const getDashboardSummary = async () => {
  const { data } = await client.get('/admin/finances/summary')
  return data
}

// ── Users ───────────────────────────────────────────────
export const getUsers = async () => {
  const { data } = await client.get('/admin/users/')
  return data
}

export const createUser = async (userData) => {
  const { data } = await client.post('/admin/users/', userData)
  return data
}

export const updateUser = async (userId, userData) => {
  const { data } = await client.put(`/admin/users/${userId}`, userData)
  return data
}

// ── Membership Plans ────────────────────────────────────
export const getMembershipPlans = async () => {
  const { data } = await client.get('/admin/memberships/plans')
  return data
}

export const assignMembership = async (payload) => {
  const { data } = await client.post('/admin/memberships/assign', payload)
  return data
}

export const getUserMemberships = async (userId) => {
  const { data } = await client.get(`/admin/memberships/user/${userId}`)
  return data
}

export const getAllMemberships = async () => {
  const { data } = await client.get('/admin/memberships/')
  return data
}

// ── Equipment ───────────────────────────────────────────
export const getEquipment = async () => {
  const { data } = await client.get('/admin/equipment/')
  return data
}

export const addEquipment = async (payload) => {
  const { data } = await client.post('/admin/equipment/', payload)
  return data
}

export const deleteEquipment = async (id) => {
  await client.delete(`/admin/equipment/${id}`)
}

export const addMaintenanceLog = async (payload) => {
  const { data } = await client.post('/admin/equipment/logs', payload)
  return data
}

// ── Member Portal ───────────────────────────────────────
export const getMyProfile = async () => {
  const { data } = await client.get('/user/profile')
  return data
}

export const getMyMembership = async () => {
  const { data } = await client.get('/user/membership')
  return data
}
