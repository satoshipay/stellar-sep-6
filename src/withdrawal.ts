import axios from "axios"
import {
  WithdrawalKYCInteractiveResponse,
  WithdrawalKYCNonInteractiveResponse,
  WithdrawalKYCStatusResponse,
  WithdrawalSuccessResponse
} from "./responses"
import { TransferServer } from "./transfer-server"
import { joinURL } from "./util"

type WithdrawalKYCResponse =
  | WithdrawalKYCInteractiveResponse
  | WithdrawalKYCNonInteractiveResponse
  | WithdrawalKYCStatusResponse

export interface WithdrawalOptions {
  /**
   * The stellar account ID of the user that wants to do the withdrawal.
   * This is only needed if the anchor requires KYC information for withdrawal.
   * The anchor can use account to look up the user's KYC information.
   */
  account: string

  /**
   * The account that the user wants to withdraw their funds to.
   * This can be a crypto account, a bank account number, IBAN, mobile number, or email address.
   */
  dest: string

  /**
   * Extra information to specify withdrawal location.
   * For crypto it may be a memo in addition to the dest address.
   * It can also be a routing number for a bank, a BIC, or the name of a partner handling the withdrawal.
   */
  dest_extra: string

  /**
   * A wallet will send this to uniquely identify a user if the wallet has multiple users sharing one Stellar account.
   * The anchor can use this along with account to look up the user's KYC info.
   */
  memo?: string

  /** Type of memo. One of text, id or hash */
  memo_type?: "hash" | "id" | "text"

  /** In communications / pages about the withdrawal, anchor should display the wallet name to the user to explain where funds are coming from. */
  wallet_name?: string

  /** Anchor can show this to the user when referencing the wallet involved in the withdrawal (ex. in the anchor's transaction history) */
  wallet_url?: string
}

export interface WithdrawalRequestSuccess {
  data: WithdrawalSuccessResponse
  type: "success"
}

export interface WithdrawalRequestKYC {
  data:
    | WithdrawalKYCInteractiveResponse
    | WithdrawalKYCNonInteractiveResponse
    | WithdrawalKYCStatusResponse
  type: "kyc"
}

export enum WithdrawalType {
  bankAccount = "bank_account",
  cash = "cash",
  crypto = "crypto",
  mobile = "mobile",
  billPayment = "bill_payment"
}

export async function withdraw(
  transferServer: TransferServer,
  type: WithdrawalType | string,
  assetCode: string,
  authToken: string | null | undefined,
  options: WithdrawalOptions
): Promise<WithdrawalRequestSuccess | WithdrawalRequestKYC> {
  const headers: any = {}
  const params = {
    ...options,
    type,
    asset_code: assetCode
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const url = joinURL(transferServer.url, "/withdraw")
  const validateStatus = (status: number) =>
    status === 200 || status === 201 || status === 403 // 201 is a TEMPO fix
  const response = await axios(url, { headers, params, validateStatus })

  if (response.status === 200) {
    return {
      data: response.data as WithdrawalSuccessResponse,
      type: "success"
    }
  } else if (response.status === 403) {
    return {
      data: response.data as WithdrawalKYCResponse,
      type: "kyc"
    }
  } else if (response.data && response.data.message) {
    throw Error(
      `Anchor responded with status code ${response.status}: ${
        response.data.message
      }`
    )
  } else {
    throw Error(
      `Anchor responded with unexpected status code: ${response.status}`
    )
  }
}
