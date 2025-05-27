import { ethers, config } from "hardhat";

import { BigNumber, providers, Wallet, ContractReceipt } from "ethers";

import { GasFreeERC20, GasFreeERC20__factory } from "../typechain-types";
import { expect } from "chai";
import { Forwarder } from "../typechain-types";
/**
 * EIP-712 서명을 위한 구조체의 필드 정보를 정의하는 인터페이스입니다.
 *
 * 이 인터페이스는 `types` 객체를 정의할 때 사용되며, 각 필드는 EIP-712 메시지 구조에서 사용되는
 * Solidity 타입과 이름으로 구성됩니다.
 *
 * @param name - 서명 구조체의 필드 이름입니다. (Solidity 멤버 변수 이름과 일치)
 * @param type - 필드의 데이터 타입입니다. Solidity 타입이어야 합니다.
 *               예: "address", "uint256", "bytes32", "string" 등
 *
 * @example
 * const personType: MessageTypeProperty[] = [
 *   { name: "name", type: "string" },
 *   { name: "wallet", type: "address" }
 * ];
 */
interface MessageTypeProperty {
  name: string;
  type: string;
}

/**
 * EIP-712 타입 정의 전체를 표현하는 인터페이스입니다.
 *
 * 이 객체는 EIP-712 구조화된 데이터 서명을 구성할 때 `types` 필드에 사용됩니다.
 * 각 키는 구조체 이름이며, 값은 해당 구조체의 필드 배열입니다.
 *
 * 예를 들어, `EIP712Domain`, `Person` 등의 구조체를 정의할 수 있습니다.
 *
 * @param [additionalProperties] {@link MessageTypeProperty} 배열로, 각 구조체의 필드를 정의합니다.
 *
 * @remarks * 구조체는 Forwarder 에 등록되어 있어야 합니다. {@link Forwarder.registerRequestType}
 * @example
 * const types: MessageTypes = {
 *   EIP712Domain: [
 *     { name: "name", type: "string" },
 *     { name: "version", type: "string" },
 *     { name: "chainId", type: "uint256" },
 *     { name: "verifyingContract", type: "address" }
 *   ],
 *   Person: [
 *     { name: "name", type: "string" },
 *     { name: "wallet", type: "address" }
 *   ],
 * };
 */
interface MessageTypes {
  /**
   * `EIP712Domain` 구조체의 필드 배열을 값으로 갖습니다.
   * 각 키는 EIP-712 메시지에 사용될 타입명입니다.
   */
  // EIP712Domain: MessageTypeProperty[];
  /**
   * 구조체 이름을 키로 하고, 해당 구조체의 필드 배열을 값으로 갖습니다.
   * 각 키는 EIP-712 메시지에 사용될 타입명입니다.
   */
  [additionalProperties: string]: MessageTypeProperty[];
}

/**
 * EIP-712 도메인 구분자(Domain Separator)를 구성하는 인터페이스입니다.
 * 이 구조체는 EIP-712 메시지 서명의 `domain` 필드로 사용됩니다.
 *
 * 각 필드는 도메인 고유성을 보장하기 위한 요소이며,
 * 메시지 위조나 체인 간 충돌을 방지하는 데 사용됩니다.
 *
 * @see https://eips.ethereum.org/EIPS/eip-712
 *
 * @param name - 서명을 사용하는 애플리케이션 또는 프로토콜의 이름입니다.
 * @param version - 메시지 형식의 버전입니다.
 * @param chainId - 현재 서명이 유효한 체인 ID입니다. (예: 1은 Mainnet)
 * @param verifyingContract - 서명 메시지를 검증하는 스마트 컨트랙트 주소입니다.
 *
 * @remarks * 도메인은 Forwarder 에 등록되어 있어야 합니다. {@link Forwarder.registerDomainSeparator}
 * @example
 * const domain: EIP712Domain = {
 *   name: "MyDapp",
 *   version: "1",
 *   chainId: 1,
 *   verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
 * };
 */
interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

/**
 * EIP-712 메타트랜잭션 메시지의 구조를 나타내는 인터페이스입니다.
 * 이 구조는 Forwarder와 RelayHub 등에서 서명 검증 및 relayCall 호출에 사용됩니다.
 *
 * @param from - 트랜잭션을 의뢰한 사용자 지갑 주소 (서명자)
 * @param to - 호출 대상 스마트 컨트랙트 주소
 * @param value - 이더 전송량 (단위: wei), 보통 0
 * @param gas - 실행 시 소비할 최대 가스량 (hex string, 예: '0x5208')
 * @param nonce - forwarder에서 사용하는 사용자 nonce 값 (hex string)
 * @param data - 호출할 함수와 파라미터가 ABI 인코딩된 바이트 데이터
 * @param validUntil - 이 트랜잭션이 유효한 마지막 블록 타임스탬프 또는 블록 넘버 (hex string)
 *
 * @example
 * const message: Eip712Message = {
 *   from: "0x1234...abcd",
 *   to: "0xabcd...1234",
 *   value: BigNumber.from("0"),
 *   gas: "0x5208", // 21000
 *   nonce: "0x01",
 *   data: "0xabcdef...",
 *   validUntil: "0xffffffff"
 * };
 */
interface Eip712Message {
  from: string;
  to: string;
  value: BigNumber;
  gas: string;
  nonce: string;
  data: string;
  validUntil: string;
}

/**
 * EIP-712 형식의 전체 서명 요청 객체를 정의하는 인터페이스입니다.
 * 이 구조는 `eth_signTypedData_v4`나 GSN, Forwarder 등에서 서명 및 실행 요청의 표준 형식으로 사용됩니다.
 *
 * @param domain - {@link EIP712Domain} 메시지에 포함된 도메인 정보로, 체인 ID, verifying contract 등 도메인 고유성 식별자
 * @param types - {@link MessageTypes} 전체 타입 정의 집합으로, 각 구조체 이름과 그에 해당하는 필드 배열로 구성됨
 * @param primaryType - 최상위 구조체 타입 이름. 서명 시 사용되는 주 구조체 명칭 (예: "ForwardRequest")
 * @param message - {@link Eip712Message} 실제 서명 대상 메시지. from, to, data, gas 등 메타 트랜잭션의 실행 정보 포함
 *
 * @example
 * const request: Eip712Request = {
 *   domain: {
 *     name: "GSN Forwarder",
 *     version: "1",
 *     chainId: 5,
 *     verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
 *   },
 *   types: {
 *     EIP712Domain: [
 *       { name: "name", type: "string" },
 *       { name: "version", type: "string" },
 *       { name: "chainId", type: "uint256" },
 *       { name: "verifyingContract", type: "address" }
 *     ],
 *     ForwardRequest: [
 *       { name: "from", type: "address" },
 *       { name: "to", type: "address" },
 *       { name: "value", type: "uint256" },
 *       { name: "gas", type: "uint256" },
 *       { name: "nonce", type: "uint256" },
 *       { name: "data", type: "bytes" },
 *       { name: "validUntil", type: "uint256" }
 *     ]
 *   },
 *   primaryType: "ForwardRequest",
 *   message: {
 *     from: "0x1234...abcd",
 *     to: "0xabcd...1234",
 *     value: BigNumber.from(0),
 *     gas: "0x5208",
 *     nonce: "0x1",
 *     data: "0xabcdef...",
 *     validUntil: "0xffffffff"
 *   }
 * };
 */
interface Eip712Request {
  domain: EIP712Domain;
  types: MessageTypes;
  primaryType: string;
  message: Eip712Message;
}
describe("Create EIP 712 Signatrue", async () => {
  let eoa1: Wallet;
  let eoa2: Wallet;
  let eip712Request: Eip712Request;
  let signature: string;
  let recovered: string;
  let forwarder: Forwarder;

  before(async () => {
    const [operator] = await ethers.getSigners();

    if (!operator.provider) {
      throw new Error("provider is undefined");
    }

    eoa1 = ethers.Wallet.createRandom().connect(operator.provider);
    eoa2 = ethers.Wallet.createRandom().connect(operator.provider);

    const forwarderFactory = await ethers.getContractFactory("Forwarder");
    forwarder = await forwarderFactory.deploy();
    await forwarder.deployed();
  });

  it("Create EIP-712 Request ", async () => {
    const types: MessageTypes = {
      // EIP712Domain: [
      //   { name: "name", type: "string" },
      //   { name: "version", type: "string" },
      //   { name: "chainId", type: "uint256" },
      //   { name: "verifyingContract", type: "address" },
      // ],
      ForwardRequest: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "validUntil", type: "uint256" },
      ],
    };

    const chainInfo = await eoa1.provider.getNetwork();
    const domain = {
      name: "GasFreeERC20",
      version: "1",
      chainId: chainInfo.chainId,
      verifyingContract: forwarder.address,
    };

    const data = GasFreeERC20__factory.createInterface().encodeFunctionData(
      "approve",
      [eoa2.address, ethers.utils.parseUnits("100", 18)],
    );

    const message: Eip712Message = {
      from: eoa1.address,
      to: forwarder.address,
      value: BigNumber.from(0),
      gas: BigNumber.from(21000).toHexString(),
      nonce: BigNumber.from(0).toHexString(),
      data,
      validUntil: String(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      ),
    };

    eip712Request = {
      domain: {
        name: domain.name,
        version: domain.version,
        chainId: chainInfo.chainId,
        verifyingContract: forwarder.address,
      },
      types: types,
      primaryType: "ForwardRequest",
      message: message,
    };

    expect(!!eip712Request).to.equals(!!eip712Request);
  });

  it("Create EIP-712 Signature", async () => {
    // Sign request
    signature = await eoa1._signTypedData(
      eip712Request.domain,
      eip712Request.types,
      {
        ...eip712Request.message,
      },
    );

    expect(!!signature).to.equal(!!signature);
  });

  it("Verify EIP-712 Signature", async () => {
    recovered = ethers.utils.verifyTypedData(
      eip712Request.domain,
      eip712Request.types,
      {
        ...eip712Request.message,
      },
      signature,
    );

    // console.log("recovered: ", recovered);

    expect(recovered).to.equal(eip712Request.message.from);
  });

  after(async () => {
    console.log("eoa1: ", eoa1.address);
    console.log("eoa2: ", eoa2.address);
    console.log("eip712Request: ", eip712Request);
    console.log("signature: ", signature);
    console.log("recovered: ", recovered);
  });
});
