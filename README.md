# EIP-712

📌 **EIP-712 Ethereum typed structed data hashing and signing**

**EIP-712**는
"**구조화된 데이터(structured data)**"를 안전하게 서명하고 검증하기 위한 Ethereum 표준입니다.

- 기존 bytes 기반 서명보다 사람이 읽기 쉬운 구조화된 타입 지원
- 피싱 공격 방지, 사용자 확인성 증가
- EIP-191 포맷을 기반으로 도메인과 메시지를 해싱 후 서명

🔍 **배경**

**기존 서명방식 (EIP-191)** 은 단순한 `bytes` 메세지를 서명

- 사람이 읽기 어려움 ( `Hex 문자열` )
- 피싱 공격에 취약함 ( `내용의 불명확성` )
- 의미없는 `bytes` 데이터를 스마트 컨트랙트에서 해석하게 되기도 함. ( `일관되지 않은 검증 구조` )

🛠️ **문제 해결**

- 데이터를 구조화(structured)

- 도메인 분리(domain separation)

- 체계적인 해싱 및 검증 방식 도입

```
✨ EIP-712 는 구조화된 데이터(Typed Structed Data)를 서명하고, 검증할 수 있도록 만들어진 표준
```

## EIP-712 구성요소

1. `Typed Structured Data`

- EIP-712 서명 요청의 **전체적인 데이터 형식** 과 **정의 방식**을 포괄하는 개념
- `JSON 객체` 형태로 표현됨
  ```
  {
    "types": {
      "EIP712Domain": [
        { "name": "name", "type": "string" },
        { "name": "version", "type": "string" },
        { "name": "chainId", "type": "uint256" },
        { "name": "verifyingContract", "type": "address" }
      ],
      "Mail": [
        { "name": "from", "type": "Person" },
        { "name": "to", "type": "Person" },
        { "name": "contents", "type": "string" }
      ],
      "Person": [
        { "name": "name", "type": "string" },
        { "name": "wallet", "type": "address" }
      ]
    }
  }
  ```

2. `Domain Separator`

- `EIP712Domain` 데이터를 해싱하여 얻은 hash 값.
  - `도메인 정보`
    - `name` : 앱 또는 프로토콜 이름
    - `version` : 메세지 포맷 버전 또는 앱(프로토콜) 버전
    - `chainId` : 체인 식별을 위한 ID (재생 공격 방지)
    - `verfiyingContract`: 검증할 Smart Contract 주소
  - `도메인 타입`
    ```
    EIP712Domain(string name, string, version, uint256 chainId, address verifyingContract)
    ```
  - `도메인 해시` (= Domain Separator)
    ```
    domainHash = keccak256(
        abi.encode(
            keccak256(bytes(EIP712_DOMAIN_TYPE)),
            keccak256(bytes(name)),
            keccak256(bytes(version)),
            chainId,
            address(verifyingConractAddress)
        )
    )
    ```

3. `Digest`

- EIP-712 구조를 따르는 최종 서명 대상 해시 값.

  ```
  keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash ));

  // EIP712_TYPE_PREFIX + Domain Separator + structHash
  ```

  - `EIP712_TYPE_PREFIX` : 고정된 preFix 값. `\x19\x01`
  - `Domain Separator` : EIP712Domain 데이터를 해싱하여 얻은 값.
  - `StructHash` : `Typed Structured Data` 에 정의된 실제 구조화된 메세지 데이터를 해싱하여 얻은 값.

    ```
     // requestType  = typeName(param type paramName, param type2, paramName2, ... )

     // typeHash = keccak256(requestType)

     structHash = keccak256(typeHash + (...typeValues))
    ```

## EIP-712 검증

1. 도메인 정보를 바탕으로 Domain Saparator 재구성
   ```
   keccak256(abi.encode(
       keccak256("EIP712Domain(string name,string version,uint256 chainId, address verifyingContract)"),
       keccak256(bytes(name)),
       keccak256(bytes(version)),
       chainId,
       address(`verifyContractAddress`)
   ))
   ```
2. types 에 정의된 메세지 구조를 통해 typeHash 구성
   ```
       typeHash = `${typeName}([paramType paramName, paramType2 paramName2, ...])`
   ```
3. typeHash 와 실제 메세지 데이터를 인코딩하여 structHash 재구성
   ```
   structHash = keccak256(abi.encode(
       typeHash,
       value1,
       value2,
   ));
   ```
4. prefix 와 DomainSaparator, structHash 를 인코딩하여 digest 재구성
   ```
   digest = keccak256(abi.encodePacked(
       "\x19\x01",
       domainSeparator,
       structHash
   ));
   ```
5. 서명 값에서 r, s, v 추출

   ```
       // solidity
       assembly {
           r := mload(add(signature, 0x20))
           s := mload(add(signature, 0x40))
           v := byte(0, mload(add(signature, 0x60)))
       }

       // js,ts 의 경우 string 또는 Uint8Array 의 slice 함수로 획득 할 수도 있습니다.
   ```

6. ecrecover 함수를 통해 서명자를 복구
   ```
       address recovered = ecrecover(digest, sig.v, sig.r, sig.s);
   ```
7. 복구된 서명자 주소와 원시 메세지의 from 에 해당하는 주소가 같은지 검증

## ✨ 결론

- EIP-712 표준을 통해 지갑 앱에서 사용자에게 **서명 데이터를 사람이 읽을 수 있는 형태**로 보여줄 수 있습니다.
- EIP-712 표준을 통해 `스마트 컨트랙트`에서 **EIP-191 포맷**으로 `구조화된 메세지`를 **안전하게 검증**할 수 있습니다.
- EIP-712 표준은 **피싱 방지, 데이터 위변조 검증, Meta Transaction 의 핵심 기반**이 됩니다.
