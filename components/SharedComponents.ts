import styled from 'styled-components';

// Tachyons + styled-components -- https://medium.com/@jikkujose/tachyons-styled-components-pure-joy-6173d3888548

export const TopBar = styled.div`
  background-color: #3f06dd;
  height: 6px;
  width: 104vw;
`

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
`;

export const LightSwitch = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 30px;
  margin: 6px;
  cursor: pointer;
`;

export const MainContentWrapper = styled.div`
  display: flex;
  /* flex-direction: column; */
  justify-content: center;
  margin: 6px;
  width: 100vw;

`;

export const MainContent = styled.div`
  width: 85%;
  max-width: 1250px;
  margin: 6px;

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100vw;
  }
`;
