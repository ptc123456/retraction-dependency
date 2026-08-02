import { z } from 'zod';

const AddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const DoiSchema = z
  .string()
  .trim()
  .regex(/^10\.[0-9]{4,9}\/[A-Za-z0-9][A-Za-z0-9._;()/:+-]*$/);
const PmidSchema = z.string().trim().regex(/^[0-9]{1,12}$/);

export const VerdictSchema = z.enum([
  'UNREVIEWED',
  'USABLE',
  'INVALID_FOR_CLAIM',
  'DISPUTED',
  'UNRESOLVED',
]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const ProposalStatusSchema = z.enum([
  'DRAFT',
  'EVIDENCE_HOLD',
  'ELIGIBLE',
  'ACTIVE',
  'INVALIDATED',
  'NONEXISTENT',
]);
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

export const ProposalSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(3).max(120),
  claimText: z.string().min(20).max(2000),
  owner: AddressSchema,
  sealed: z.boolean(),
  activated: z.boolean(),
  status: ProposalStatusSchema,
  totalDependencies: z.number().int().min(0).max(5),
  invalidDependencies: z.number().int().min(0).max(5),
  revision: z.number().int().positive(),
});
export type Proposal = z.infer<typeof ProposalSchema>;

export const ProposalStatusResultSchema = z.object({
  status: ProposalStatusSchema,
  hasPendingReview: z.boolean(),
});

export const DependencySchema = z.object({
  id: z.number().int().positive(),
  proposalId: z.number().int().positive(),
  originalDoi: DoiSchema,
  originalPmid: PmidSchema,
  dependencyStatement: z.string().min(20).max(1000),
  verdict: VerdictSchema,
  reviewStatus: z.enum(['IDLE', 'PENDING']),
  pendingNoticeDoi: z.string(),
  pendingNoticePmid: z.string(),
  acceptedNoticeCount: z.number().int().min(0).max(3),
  reviewRound: z.number().int().min(0),
  revision: z.number().int().positive(),
  pendingRequester: AddressSchema,
});
export type Dependency = z.infer<typeof DependencySchema>;

export const EvaluationRecordSchema = z.object({
  dependencyId: z.number().int().positive(),
  reviewRound: z.number().int().positive(),
  policyVersion: z.number().int().positive(),
  originalDoi: DoiSchema,
  originalPmid: PmidSchema,
  noticeDoi: DoiSchema,
  noticePmid: PmidSchema,
  noticePmcid: z.string().regex(/^PMC[0-9]+$/),
  updateKind: z.enum(['correction', 'retraction']),
  publicationDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
  crossrefRelation: z.string(),
  europePmcRelation: z.string(),
  bindingStatus: z.enum(['BOUND', 'NOT_BOUND', 'CONFLICTING_BINDING', 'BINDING_UNRESOLVED']),
  materialEffect: z.enum([
    'NO_MATERIAL_EFFECT',
    'MATERIALLY_UNDERMINES',
    'AMBIGUOUS_EFFECT',
    'EVIDENCE_INCOMPLETE',
  ]),
  verdict: VerdictSchema,
  reasonCode: z.string(),
  reasonSummary: z.string().min(1).max(360),
  requester: AddressSchema,
  resolver: AddressSchema,
});
export type EvaluationRecord = z.infer<typeof EvaluationRecordSchema>;

export const RejectedTriggerSchema = z.object({
  dependencyId: z.number().int().positive(),
  noticeDoi: DoiSchema,
  noticePmid: PmidSchema,
  rejectionCode: z.string(),
  reviewRound: z.number().int().positive(),
  requester: AddressSchema,
});
export type RejectedTrigger = z.infer<typeof RejectedTriggerSchema>;

export const DependencyHistorySchema = z.object({
  dependencyId: z.number().int().positive(),
  acceptedEvaluations: z.array(EvaluationRecordSchema).max(3),
  latestRejectedTrigger: RejectedTriggerSchema.nullable(),
});
export type DependencyHistory = z.infer<typeof DependencyHistorySchema>;

export const PolicySchema = z.object({
  policyVersion: z.number().int().positive(),
  supportedUpdateTypes: z.array(z.enum(['correction', 'retraction'])),
  sourcePolicy: z.literal('CROSSREF_PLUS_EUROPE_PMC_OPEN_NOTICE'),
  maxDependenciesPerProposal: z.number().int().min(1).max(5),
  maxNoticesPerDependency: z.number().int().min(1).max(3),
  inputBounds: z.record(z.union([z.number(), z.array(z.number())])),
  verdicts: z.array(VerdictSchema),
  safeFailure: z.record(z.string()),
  allowedSources: z.array(z.string()),
  requiredBinding: z.string(),
});
export type Policy = z.infer<typeof PolicySchema>;

export const CountsSchema = z.object({
  proposals: z.number().int().min(0),
  dependencies: z.number().int().min(0),
});
export type Counts = z.infer<typeof CountsSchema>;

export const DependencyFormSchema = z.object({
  originalDoi: DoiSchema,
  originalPmid: PmidSchema,
  dependencyStatement: z.string().trim().min(20, 'Statement must be 20–1000 characters').max(1000),
  noticeDoi: DoiSchema,
  noticePmid: PmidSchema,
});

export const CreateProposalFormSchema = z.object({
  title: z.string().trim().min(3, 'Title must be 3–120 characters').max(120),
  claimText: z.string().trim().min(20, 'Claim statement must be 20–2000 characters').max(2000),
  dependencies: z
    .array(DependencyFormSchema)
    .min(1, 'At least 1 dependency is required')
    .max(5, 'Maximum 5 dependencies allowed'),
});
export type CreateProposalForm = z.infer<typeof CreateProposalFormSchema>;

export const RequestReviewFormSchema = z.object({
  noticeDoi: DoiSchema,
  noticePmid: PmidSchema,
});
export type RequestReviewForm = z.infer<typeof RequestReviewFormSchema>;
