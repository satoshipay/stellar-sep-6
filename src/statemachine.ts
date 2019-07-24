// tslint:disable no-object-literal-type-assertion
import { WebauthData } from "@satoshipay/stellar-sep-10"
import { Asset, Transaction } from "stellar-sdk"
import {
  KYCInteractiveResponse,
  KYCStatusResponse,
  TransferServer,
  WithdrawalSuccessResponse
} from "./index"

interface GeneralWithdrawalDetails {
  asset: Asset
  withdrawalFormValues: { [fieldName: string]: string }
  method: string
  transferServer: TransferServer
}

export interface InitialState {
  step: "initial"
  details?: Partial<GeneralWithdrawalDetails>
}

export interface BeforeWebauthState {
  step: "before-webauth"
  details: GeneralWithdrawalDetails
  webauth?: WebauthData & { transaction: Transaction }
}

export interface AfterWebauthState {
  step: "after-webauth"
  authToken?: string
  details: GeneralWithdrawalDetails
}

export interface BeforeInteractiveState {
  step: "before-interactive-kyc"
  details: GeneralWithdrawalDetails
  kyc: KYCInteractiveResponse
}

export interface PendingKYCState {
  step: "pending-kyc"
  details: GeneralWithdrawalDetails
  kycStatus: KYCStatusResponse<"pending">
}

export interface AfterDeniedKYCState {
  step: "after-denied-kyc"
  details: GeneralWithdrawalDetails
  rejection: KYCStatusResponse<"denied">
}

export interface AfterSuccessfulKYC {
  step: "after-successful-kyc"
  authToken?: string
  details: GeneralWithdrawalDetails
  withdrawal: WithdrawalSuccessResponse
}

export interface AfterTransactionState {
  step: "after-tx-submission"
}

export type State =
  | InitialState
  | BeforeWebauthState
  | AfterWebauthState
  | BeforeInteractiveState
  | PendingKYCState
  | AfterDeniedKYCState
  | AfterSuccessfulKYC
  | AfterTransactionState

const backToStart = () =>
  ({
    type: "back-to-start"
  } as const)

const saveInitFormData = (
  transferServer: TransferServer,
  asset: Asset,
  method: string,
  formValues: { [fieldName: string]: string },
  webauth: WebauthData & { transaction: Transaction } | undefined
) =>
  ({
    type: "save-init-form",
    asset,
    formValues,
    method,
    transferServer,
    webauth
  } as const)

const setAuthToken = (token: string | undefined) =>
  ({
    type: "set-auth-token",
    token
  } as const)

const startInteractiveKYC = (response: KYCInteractiveResponse) =>
  ({
    type: "start-interactive-kyc",
    response
  } as const)

const pendingKYC = (response: KYCStatusResponse<"pending">) =>
  ({
    type: "kyc-pending",
    response
  } as const)

const failedKYC = (response: KYCStatusResponse<"denied">) =>
  ({
    type: "kyc-denied",
    response
  } as const)

const successfulKYC = (response: WithdrawalSuccessResponse) =>
  ({
    type: "kyc-successful",
    response
  } as const)

const transactionSubmitted = () =>
  ({
    type: "after-tx-submission"
  } as const)

export type Action =
  | ReturnType<typeof backToStart>
  | ReturnType<typeof saveInitFormData>
  | ReturnType<typeof setAuthToken>
  | ReturnType<typeof startInteractiveKYC>
  | ReturnType<typeof failedKYC>
  | ReturnType<typeof pendingKYC>
  | ReturnType<typeof successfulKYC>
  | ReturnType<typeof transactionSubmitted>

export const Action = {
  backToStart,
  saveInitFormData,
  setAuthToken,
  startInteractiveKYC,
  failedKYC,
  pendingKYC,
  successfulKYC,
  transactionSubmitted
}

export const initialState: State = {
  step: "initial"
}

export function stateMachine(state: State, action: Action): State {
  switch (action.type) {
    case "back-to-start":
      return {
        step: "initial",
        details: "details" in state ? state.details : undefined
      }
    case "save-init-form":
      if (action.webauth) {
        return {
          step: "before-webauth",
          details: {
            asset: action.asset,
            withdrawalFormValues: action.formValues,
            method: action.method,
            transferServer: action.transferServer
          },
          webauth: action.webauth
        }
      } else {
        return {
          step: "after-webauth",
          authToken: undefined,
          details: {
            asset: action.asset,
            withdrawalFormValues: action.formValues,
            method: action.method,
            transferServer: action.transferServer
          }
        }
      }
    case "set-auth-token":
      if (state.step !== "before-webauth") {
        throw Error("Cannot set auth token at this time.")
      }
      return {
        ...state,
        step: "after-webauth",
        authToken: action.token
      }
    case "start-interactive-kyc":
      if (!("details" in state) || state.step === "initial") {
        throw Error(`Cannot perform ${action.type} in state ${state.step}.`)
      }
      return {
        step: "before-interactive-kyc",
        details: state.details,
        kyc: action.response
      }
    case "kyc-pending":
      if (!("details" in state) || state.step === "initial") {
        throw Error(`Cannot perform ${action.type} in state ${state.step}.`)
      }
      return {
        step: "pending-kyc",
        details: state.details,
        kycStatus: action.response
      }
    case "kyc-denied":
      if (!("details" in state) || state.step === "initial") {
        throw Error(`Cannot perform ${action.type} in state ${state.step}.`)
      }
      return {
        step: "after-denied-kyc",
        details: state.details,
        rejection: action.response
      }
    case "kyc-successful":
      if (!("details" in state) || state.step === "initial") {
        throw Error(`Cannot perform ${action.type} in state ${state.step}.`)
      }
      return {
        step: "after-successful-kyc",
        details: state.details,
        withdrawal: action.response
      }
    case "after-tx-submission":
      return {
        step: "after-tx-submission"
      }
    default:
      throw Error(`Unexpected action: ${(action as Action).type}`)
  }
}
