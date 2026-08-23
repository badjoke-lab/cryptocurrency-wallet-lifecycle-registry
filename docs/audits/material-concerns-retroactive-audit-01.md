# WLR material concerns retroactive audit — pass 01

Status: in progress
Parent: #269
Spec: `docs/material-concerns-and-retroactive-audit-spec.md`

## Authority inspected

`data/products.json` is canonical product authority for this pass.

## Confirmed migration finding

The current product records are heterogeneous with respect to custody/key-control metadata. Some software/smart-account products already expose `custody_model` and `key_management_model`, while many hardware/companion products do not carry equivalent explicit custody/recovery fields in the product record. Therefore the new public custody/key-control summary cannot safely interpret missing fields as self-custody, user-controlled recovery, or not-applicable.

## Sampled canonical findings

| product | existing explicit custody data | audit result |
|---|---|---|
| MetaMask Browser Extension | `custody_model=self_custody`; `key_management_model=software_key_vault` | derivable for custody/key-management; recovery still requires evidence review |
| MetaMask Mobile | `custody_model=self_custody`; `key_management_model=software_key_vault` | derivable for custody/key-management; recovery still requires evidence review |
| Safe Smart Account | `custody_model=self_custody`; `key_management_model=configurable_multisig_smart_account` | derivable for custody/key-management; signer/recovery configuration must remain product/account specific |
| Gnosis Safe Mobile (legacy) | `custody_model=self_custody`; `key_management_model=smart_account_mobile_interface` | derivable for historical custody classification; recovery detail requires evidence review |
| Trezor Model One / Model T / Safe family sample | no equivalent explicit custody/key-management fields in sampled product objects | research/derivation required; missing metadata must not be rendered as a favorable default |
| Trezor Suite | companion app without equivalent explicit custody/key-management fields in sampled product object | relationship to signer/key custody must be derived from evidence; do not label the app itself as holding keys by inference |
| Ledger hardware/app sample | no equivalent explicit custody/key-management fields in sampled product objects | research/derivation required; product type alone is insufficient for the new summary |

## Migration rules confirmed

1. `custody_model` and `key_management_model` may be reused where explicitly present and supported, but do not answer every recovery/dependency question.
2. Missing custody fields are not `self_custody` and are not automatically `not_applicable`.
3. Hardware-device, companion-app and smart-account records need different evidence interpretation; product type must not be collapsed into custody status.
4. Recovery capability, account/service dependency and third-party infrastructure remain independent dimensions.
5. IZAKA-YA Wallet must be evaluated under these same rules and cannot receive a richer warning model than legacy hosted/custodial products without a retroactive pass.

## Next pass

Enumerate every canonical product and produce a matrix for custody model, key control, seed/recovery, independent recovery, account dependency, third-party custody/MPC, withdrawal dependency and integrated yield/exchange dependency. Split correction work into derivable metadata/UI changes and research-required records.
