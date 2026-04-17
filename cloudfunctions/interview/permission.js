const { COLLECTIONS, FOUNDER_ROLES, INTERVIEW_ROLES } = require('./constants');
const { normalizeRole, normalizeText } = require('./validators');
const { getCandidateInterviewers } = require('./summary');

function buildIdentifierSet(source = {}) {
  if (typeof source === 'string') {
    return new Set([String(source)]);
  }

  return new Set(
    [
      source.id,
      source._id,
      source.userId,
      source.adminId,
      source.username,
      source.account,
      source.name,
      source.openId
    ]
      .filter(Boolean)
      .map((item) => String(item))
  );
}

function normalizeAssignedInterviewer(interviewer, adminProfile, fallbackRole) {
  if (typeof interviewer === 'string') {
    return {
      id: adminProfile?._id || interviewer,
      _id: adminProfile?._id || '',
      userId: adminProfile?._id || '',
      adminId: adminProfile?._id || '',
      username: adminProfile?.username || interviewer,
      account: adminProfile?.username || interviewer,
      name: adminProfile?.name || interviewer,
      role: normalizeRole(adminProfile?.role || fallbackRole)
    };
  }

  return {
    ...interviewer,
    role: normalizeRole(interviewer?.role || adminProfile?.role || fallbackRole),
    id: interviewer?.id || interviewer?._id || interviewer?.userId || interviewer?.adminId || adminProfile?._id || '',
    _id: interviewer?._id || interviewer?.id || interviewer?.userId || interviewer?.adminId || adminProfile?._id || '',
    userId: interviewer?.userId || interviewer?.id || interviewer?._id || interviewer?.adminId || adminProfile?._id || '',
    adminId: interviewer?.adminId || interviewer?.id || interviewer?._id || interviewer?.userId || adminProfile?._id || '',
    username: interviewer?.username || interviewer?.account || adminProfile?.username || '',
    account: interviewer?.account || interviewer?.username || adminProfile?.username || '',
    name: interviewer?.name || adminProfile?.name || ''
  };
}

async function findAssignedInterviewer(db, candidate, role, operatorId) {
  const normalizedRole = normalizeRole(role);
  const identifier = normalizeText(operatorId, 100);
  const interviewers = getCandidateInterviewers(candidate);
  const operatorAdmin = await getAdminByOperatorId(db, identifier);

  if (!identifier) {
    return null;
  }

  for (const interviewer of interviewers) {
    if (!interviewer) {
      continue;
    }

    if (typeof interviewer === 'string') {
      const interviewerIdentifiers = buildIdentifierSet(interviewer);
      if (operatorAdmin) {
        const adminIdentifiers = buildIdentifierSet(operatorAdmin);
        const roleMatches = normalizeRole(operatorAdmin.role || '') === normalizedRole;
        const identifierMatches = [...adminIdentifiers].some((item) => interviewerIdentifiers.has(item));
        if (roleMatches && identifierMatches) {
          return normalizeAssignedInterviewer(interviewer, operatorAdmin, normalizedRole);
        }
      }

      if (interviewerIdentifiers.has(identifier)) {
        return normalizeAssignedInterviewer(interviewer, operatorAdmin, normalizedRole);
      }

      continue;
    }

    const interviewerRole = interviewer?.role || operatorAdmin?.role || '';
    if (!interviewerRole || normalizeRole(interviewerRole) !== normalizedRole) {
      continue;
    }

    const interviewerIdentifiers = buildIdentifierSet(interviewer);
    if (interviewerIdentifiers.has(identifier)) {
      return normalizeAssignedInterviewer(interviewer, operatorAdmin, normalizedRole);
    }

    if (operatorAdmin) {
      const adminIdentifiers = buildIdentifierSet(operatorAdmin);
      const identifierMatches = [...adminIdentifiers].some((item) => interviewerIdentifiers.has(item));
      if (identifierMatches) {
        return normalizeAssignedInterviewer(interviewer, operatorAdmin, normalizedRole);
      }
    }
  }

  return null;
}

async function findAssignedInterviewerFromEvaluations(db, candidate, role, operatorId) {
  const normalizedRole = normalizeRole(role);
  const identifier = normalizeText(operatorId, 100);
  if (!candidate?._id || !identifier) {
    return null;
  }

  const operatorAdmin = await getAdminByOperatorId(db, identifier);
  const _ = db.command;
  const res = await db.collection(COLLECTIONS.interviewEvaluations).where({
    candidateId: candidate._id,
    deletedAt: _.exists(false)
  }).get();
  const records = Array.isArray(res.data) ? res.data : [];

  for (const record of records) {
    const recordRole = normalizeText(record?.interviewerRole || record?.role, 100);
    if (!recordRole || normalizeRole(recordRole) !== normalizedRole) {
      continue;
    }

    const assignedInterviewer = normalizeAssignedInterviewer(
      record?.assignedInterviewer || {
        id: record?.interviewerId,
        _id: record?.interviewerId,
        userId: record?.interviewerId,
        adminId: record?.interviewerId,
        username: record?.operator?.username || '',
        account: record?.operator?.username || '',
        name: record?.interviewerName || record?.operator?.name || ''
      },
      operatorAdmin,
      normalizedRole
    );

    const interviewerIdentifiers = buildIdentifierSet(assignedInterviewer);
    if (interviewerIdentifiers.has(identifier)) {
      return assignedInterviewer;
    }

    if (operatorAdmin) {
      const adminIdentifiers = buildIdentifierSet(operatorAdmin);
      const identifierMatches = [...adminIdentifiers].some((item) => interviewerIdentifiers.has(item));
      if (identifierMatches) {
        return assignedInterviewer;
      }
    }
  }

  return null;
}

async function ensureCandidateInterviewerAssignment(db, candidate, assignedInterviewer) {
  if (!candidate?._id || !assignedInterviewer) {
    return;
  }

  const currentInterview = candidate.interview && typeof candidate.interview === 'object'
    ? candidate.interview
    : null;
  if (!currentInterview) {
    return;
  }

  const currentInterviewers = getCandidateInterviewers(candidate);
  const targetRole = normalizeRole(assignedInterviewer.role || '');
  const targetIdentifiers = buildIdentifierSet(assignedInterviewer);
  const exists = currentInterviewers.some((item) => {
    if (!item || typeof item === 'string') {
      return false;
    }

    let interviewerRole = '';
    try {
      interviewerRole = normalizeRole(item.role || '');
    } catch (error) {
      return false;
    }

    const roleMatches = interviewerRole === targetRole;
    if (!roleMatches) {
      return false;
    }

    const identifiers = buildIdentifierSet(item);
    return [...identifiers].some((identifier) => targetIdentifiers.has(identifier));
  });

  if (exists) {
    return;
  }

  const nextInterviewers = [
    ...currentInterviewers,
    assignedInterviewer
  ];

  await db.collection(COLLECTIONS.candidates).doc(candidate._id).update({
    data: {
      interview: {
        ...currentInterview,
        interviewers: nextInterviewers
      }
    }
  }).catch(() => null);
}

async function getAdminByOperatorId(db, operatorId) {
  const identifier = normalizeText(operatorId, 100);
  if (!identifier) return null;

  const directDoc = await db.collection(COLLECTIONS.admins).doc(identifier).get().catch(() => null);
  if (directDoc?.data) {
    return directDoc.data;
  }

  const fields = ['username', 'name'];
  for (const field of fields) {
    const res = await db.collection(COLLECTIONS.admins).where({
      [field]: identifier
    }).limit(1).get();
    if (res.data[0]) {
      return res.data[0];
    }
  }

  return null;
}

async function getUserProfileByOpenId(db, openId) {
  const identifier = normalizeText(openId, 100);
  if (!identifier) return null;

  const res = await db.collection(COLLECTIONS.users).where({
    openId: identifier
  }).limit(1).get();

  return res.data[0] || null;
}

async function assertInterviewerPermission({ db, candidate, role, operatorId, operatorName, openId }) {
  const normalizedRole = normalizeRole(role);
  const normalizedOperatorId = normalizeText(operatorId || openId, 100);
  if (!normalizedOperatorId) {
    throw new Error('缺少面试官身份标识');
  }

  let assignedInterviewer = await findAssignedInterviewer(db, candidate, normalizedRole, normalizedOperatorId);
  if (!assignedInterviewer) {
    assignedInterviewer = await findAssignedInterviewerFromEvaluations(
      db,
      candidate,
      normalizedRole,
      normalizedOperatorId
    );
    if (assignedInterviewer) {
      await ensureCandidateInterviewerAssignment(db, candidate, assignedInterviewer);
    }
  }
  if (!assignedInterviewer && normalizedRole === 'admin') {
    const founder = await assertFounderPermission({
      db,
      operatorId: normalizedOperatorId,
      openId,
      operatorRole: normalizedRole
    }).catch(() => null);

    if (founder) {
      assignedInterviewer = {
        id: founder.founderId,
        _id: founder.founderId,
        userId: founder.founderId,
        adminId: founder.founderId,
        username: '',
        account: '',
        name: founder.founderName,
        role: normalizedRole
      };
      await ensureCandidateInterviewerAssignment(db, candidate, assignedInterviewer);
    }
  }
  if (!assignedInterviewer) {
    throw new Error('无权限操作该候选人的面试记录');
  }

  const identifiers = buildIdentifierSet(assignedInterviewer);
  if (!identifiers.has(normalizedOperatorId)) {
    throw new Error('面试官身份与分配关系不匹配');
  }

  return {
    interviewerId: String(
      assignedInterviewer.id ||
      assignedInterviewer._id ||
      assignedInterviewer.userId ||
      assignedInterviewer.adminId ||
      assignedInterviewer.username ||
      assignedInterviewer.account ||
      assignedInterviewer.name ||
      normalizedOperatorId
    ),
    interviewerRole: normalizedRole,
    interviewerName: normalizeText(
      operatorName ||
      assignedInterviewer.name ||
      assignedInterviewer.username ||
      assignedInterviewer.account,
      100
    ),
    assignedInterviewer
  };
}

async function assertFounderPermission({ db, operatorId, openId, operatorRole }) {
  const admin = await getAdminByOperatorId(db, operatorId);
  if (admin && FOUNDER_ROLES.includes(String(admin.role || '').toLowerCase())) {
    return {
      founderId: String(admin._id),
      founderRole: String(admin.role || '').toLowerCase(),
      founderName: normalizeText(admin.name || admin.username, 100)
    };
  }

  const user = await getUserProfileByOpenId(db, openId);
  if (user && FOUNDER_ROLES.includes(String(user.profile?.role || user.role || '').toLowerCase())) {
    return {
      founderId: String(user._id || openId),
      founderRole: String(user.profile?.role || user.role || '').toLowerCase(),
      founderName: normalizeText(user.profile?.name || user.nickname || '', 100)
    };
  }

  throw new Error('无权查看汇总或执行终裁');
}

function canReadEvaluationDetail(operator, evaluation) {
  if (!evaluation) return true;
  return (
    operator.interviewerId === evaluation.interviewerId &&
    operator.interviewerRole === evaluation.interviewerRole
  );
}

module.exports = {
  assertFounderPermission,
  assertInterviewerPermission,
  canReadEvaluationDetail,
  findAssignedInterviewer,
  findAssignedInterviewerFromEvaluations,
  getAdminByOperatorId
};
