/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Button, Card, Divider, Input, List } from 'antd';
import { Address, AddressInput } from 'eth-components/ant';
import { transactor } from 'eth-components/functions';
import { EthComponentsSettingsContext } from 'eth-components/models';
import { useContractReader, useGasPrice } from 'eth-hooks';
import { useEthersContext } from 'eth-hooks/context';
import { BigNumber } from 'ethers';
import React, { useState, FC, useContext, ReactNode, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAppContracts } from '~~/config/contractContext';
import { SoulBoundNFTFactory, SoulBoundNFT__factory } from '~~/generated/contract-types';
import { SoulBoundNFT } from '~~/generated/contract-types/SoulBoundNFT';
// import { SetPurposeEvent } from '~~/generated/contract-types/YourContract';

export interface IExampleUIProps {
  mainnetProvider: StaticJsonRpcProvider | undefined;
  yourCurrentBalance: BigNumber | undefined;
  price: number;
  setRoute: React.Dispatch<React.SetStateAction<string>>;
}

export const ExampleUI: FC<IExampleUIProps> = (props) => {
  type UrlParams = {
    contractAddress: string;
  };

  type ContractInformation = {
    address: string;
    contractInformation: SoulBoundNFTFactory.ContractInfoStructOutput | undefined;
  };

  type TProxyContractData = {
    organization: string;
    transferable: boolean;
    nextId: BigNumber;
    paused: boolean;
    mintable: boolean;
    mintPrice: number;
    version: BigNumber;
  };

  const params = useParams<UrlParams>();

  const [svg, setSvg] = useState('');
  const [addressTo, setAddressTo] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('');
  const ethersContext = useEthersContext();
  const [yourCollectibles, setYourCollectibles] = useState<any[]>();

  const signer = ethersContext.signer;
  const address = ethersContext.account ?? '';

  const soulBoundNFTFactory = useAppContracts('SoulBoundNFTFactory', ethersContext.chainId);

  // const yourContract = useAppContracts('YourContract', ethersContext.chainId);
  const [collections] = useContractReader(soulBoundNFTFactory, soulBoundNFTFactory?.getProxiesByOwnerAddress, [
    address,
  ]);

  // const [minted] = useContractReader()

  const [contractsInfo, setContractsInfo] = useState<ContractInformation[]>();

  const [proxyContract, setProxyContract] = useState<SoulBoundNFT>();

  const [proxyContractData, setProxyContractData] = useState<TProxyContractData>();

  const loadProxy = (address: string): void => {
    if (params.contractAddress && params.contractAddress !== '0x' && ethersContext.signer) {
      setProxyContract(SoulBoundNFT__factory.connect(params.contractAddress, ethersContext.signer));
    }
  };

  useEffect(() => {
    loadProxy(params.contractAddress);
  }, [params.contractAddress]);

  const fetchContractInfoByAddress = async (
    address: string
  ): Promise<{ address: string; contractInformation: SoulBoundNFTFactory.ContractInfoStructOutput | undefined }> => {
    const contractInformation = await soulBoundNFTFactory?.getContractInfoByProxyAddress(address);
    return { address, contractInformation };
  };

  const fetchContractInfoBatched = async (): Promise<void> => {
    if (collections === undefined) return;
    const info: ContractInformation[] = await Promise.all(
      collections?.map(async (x) => {
        return await fetchContractInfoByAddress(x);
      })
    );
    setContractsInfo(info);
  };

  useEffect(() => {
    void fetchContractInfoBatched();
  }, [collections]);

  const fetchProxyValues = async (): Promise<void> => {
    if (proxyContract === undefined) return;
    await Promise.all([
      proxyContract.organization(),
      proxyContract.transferable(),
      proxyContract.nextId(),
      proxyContract.paused(),
      // mintable
      // mintPrice
      proxyContract.version(),
    ]).then(([organization, transferable, nextId, paused, version]) => {
      setProxyContractData({
        organization,
        transferable,
        nextId,
        paused,
        mintable: false,
        mintPrice: 0,
        version,
      });
    });
  };

  useEffect(() => {
    void fetchProxyValues();
  }, [proxyContract]);

  useEffect(() => {
    const updateYourCollectibles = async (): Promise<void> => {
      const collectibleUpdate = [];
      if (proxyContractData === undefined || proxyContract === undefined) return;
      for (let tokenIndex = 0; BigNumber.from(tokenIndex) < proxyContractData.nextId; tokenIndex++) {
        try {
          console.log('tokenId', tokenIndex);
          const tokenURI = await proxyContract.tokenURI(tokenIndex);
          console.log('TOKENURI', tokenURI);
          const jsonManifestString = tokenURI.substring(27);
          console.log('jsonManifestString', jsonManifestString);
          /*
          const ipfsHash = tokenURI.replace("https://ipfs.io/ipfs/", "");
          console.log("ipfsHash", ipfsHash);
          const jsonManifestBuffer = await getFromIPFS(ipfsHash);
        */
          try {
            const jsonManifest = JSON.parse(jsonManifestString);
            console.log('jsonManifest', jsonManifest);
            collectibleUpdate.push({ id: tokenIndex, uri: tokenURI, owner: address, ...jsonManifest });
          } catch (e) {
            console.log(e);
          }
        } catch (e) {
          console.log(e);
        }
      }
      setYourCollectibles(collectibleUpdate.reverse());
    };
    void updateYourCollectibles();
  }, [address, proxyContractData?.nextId]);

  // const [setPurposeEvents] = useEventListener<SetPurposeEvent>(yourContract, yourContract?.filters.SetPurpose(), 1);

  const ethComponentsSettings = useContext(EthComponentsSettingsContext);
  const [gasPrice] = useGasPrice(ethersContext.chainId, 'fast');
  const tx = transactor(ethComponentsSettings, ethersContext?.signer, gasPrice);

  const { mainnetProvider, yourCurrentBalance, price } = props;

  return (
    <div>
      <div style={{ border: '1px solid #cccccc', padding: 16, width: 400, margin: 'auto', marginTop: 64 }}>
        <h2>NFT Collections</h2>
        <h4>List of collections you are the owner of</h4>
        <List
          bordered
          dataSource={contractsInfo}
          renderItem={(item): ReactNode => {
            return (
              <List.Item key={item.address}>
                <Address address={item.address} ensProvider={mainnetProvider} fontSize={16} />
                <br />
                {item?.contractInformation?.name} ({item?.contractInformation?.symbol}) -{' '}
                {item?.contractInformation?.organization}
                <br />
                Transferable on create: {item?.contractInformation?.transferable ? 'YES' : 'NO'}
                <br />
                <Link
                  onClick={(): void => {
                    props.setRoute('/address/' + item.address);
                  }}
                  to={`/address/${item.address}`}>
                  Go to collection&apos;s page
                </Link>
              </List.Item>
            );
          }}
        />
        {proxyContractData && (
          <>
            <Divider />
            <div style={{ margin: 8 }}>
              <h3>{proxyContractData.organization}</h3>
              <div>
                <p>Currently you have minted {proxyContractData.nextId.toString()} tokens</p>
              </div>

              <Input
                onChange={(e): void => {
                  setSvg(e.target.value);
                }}
              />
              <Button
                style={{ marginTop: 8 }}
                onClick={async (): Promise<void> => {
                  const result = tx?.(proxyContract?.setSvgLogo(svg.replaceAll('"', "'")), (update: any) => {
                    console.log('📡 Transaction Update:', update);
                    if (update && (update.status === 'confirmed' || update.status === 1)) {
                      console.log(' 🍾 Transaction ' + update.hash + ' finished!');
                      console.log(
                        ' ⛽️ ' +
                          update.gasUsed +
                          '/' +
                          (update.gasLimit || update.gas) +
                          ' @ ' +
                          parseFloat(update.gasPrice) / 1000000000 +
                          ' gwei'
                      );
                    }
                  });
                  console.log('awaiting metamask/web3 confirm result...', result);
                  console.log(await result);
                }}>
                Set SVG!
              </Button>
            </div>

            <Divider />
            <div style={{ margin: 8 }}>
              <h3>Mint a new SoulBound Token</h3>
              <AddressInput address={addressTo} ensProvider={mainnetProvider} onChange={setAddressTo} />
              <Input
                style={{ marginTop: 8 }}
                placeholder="Nickname"
                onChange={(e): void => {
                  setNickname(e.target.value);
                }}
              />
              <Input
                style={{ marginTop: 8 }}
                placeholder="Role"
                onChange={(e): void => {
                  setRole(e.target.value);
                }}
              />
              <Button
                style={{ marginTop: 8 }}
                onClick={async (): Promise<void> => {
                  const result = tx?.(proxyContract?.mint(addressTo, nickname, role), (update: any) => {
                    console.log('📡 Transaction Update:', update);
                    if (update && (update.status === 'confirmed' || update.status === 1)) {
                      console.log(' 🍾 Transaction ' + update.hash + ' finished!');
                      console.log(
                        ' ⛽️ ' +
                          update.gasUsed +
                          '/' +
                          (update.gasLimit || update.gas) +
                          ' @ ' +
                          parseFloat(update.gasPrice) / 1000000000 +
                          ' gwei'
                      );
                    }
                  });
                  console.log('awaiting metamask/web3 confirm result...', result);
                  console.log(await result);
                }}>
                Mint!
              </Button>
              {proxyContractData.nextId > BigNumber.from(0) && yourCollectibles && (
                <>
                  <Divider />
                  <div style={{ margin: 'auto', paddingBottom: 256 }}>
                    <List
                      bordered
                      dataSource={yourCollectibles}
                      renderItem={(item): React.ReactNode => {
                        const id = item.id;

                        // console.log('IMAGE', item.image);

                        return (
                          <List.Item key={id + '_' + item.uri + '_' + item.owner}>
                            <Card
                              title={
                                <div>
                                  <span style={{ fontSize: 18, marginRight: 8 }}>{item.name}</span>
                                </div>
                              }>
                              <a
                                href={
                                  'https://opensea.io/assets/' /* +
                                  (readContracts &&
                                    readContracts.YourCollectible &&
                                    readContracts.YourCollectible.address) +
                                  '/' +
                                  item.id*/
                                }
                                target="_blank"
                                rel="noreferrer">
                                <img src={item.image} />
                              </a>
                              <div>{item.description}</div>
                            </Card>
                          </List.Item>
                        );
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/*
        📑 Maybe display a list of events?
      
      <div style={{ width: 600, margin: 'auto', marginTop: 32, paddingBottom: 32 }}>
        <h2>Events:</h2>
        <List
          bordered
          dataSource={setPurposeEvents}
          renderItem={(item: SetPurposeEvent): ReactNode => {
            return (
              <List.Item key={item.blockNumber + '_' + item.address}>
                <Address address={item.address} ensProvider={mainnetProvider} fontSize={16} /> {' - '}
                {item.args.purpose}
              </List.Item>
            );
          }}
        />
      </div>
      */}
    </div>
  );
};
